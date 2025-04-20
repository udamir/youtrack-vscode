import * as fs from "node:fs"
import * as path from "node:path"
import * as yaml from "js-yaml"
import * as logger from "../../utils/logger"

import type { YoutrackFileData, EditableEntityType } from "./yt-files.types"
import { FILE_STATUS_SYNC, FILE_TYPE_ISSUE, FILE_TYPE_ARTICLE, YT_FILE_EXTENSION } from "./yt-files.consts"

/**
 * Scan existing .yt files in temp directory
 * @param tempDirectory Path to temp directory
 * @returns Map of file paths to file data
 */
export function scanYoutrackFiles(tempDirectory: string): Map<string, YoutrackFileData> {
  const result = new Map<string, YoutrackFileData>()

  if (!tempDirectory || !fs.existsSync(tempDirectory)) {
    logger.debug(`Temp directory does not exist: ${tempDirectory}`)
    return result
  }

  try {
    const files = fs.readdirSync(tempDirectory)
    logger.debug(`Found ${files.length} files in temp directory`)

    // Process files with .yt extension
    for (const filename of files) {
      if (path.extname(filename) === YT_FILE_EXTENSION) {
        const filePath = path.join(tempDirectory, filename)

        try {
          const fileData = parseYoutrackFile(filePath)
          if (fileData) {
            logger.debug(`Parsed .yt file: ${filename}, entity: ${fileData.entityType}, id: ${fileData.idReadable}`)
            result.set(filePath, fileData)
          }
        } catch (error) {
          logger.error(`Failed to parse .yt file "${filename}": ${error}`)
        }
      }
    }
  } catch (error) {
    logger.error(`Error scanning temp directory "${tempDirectory}": ${error}`)
  }

  return result
}

/**
 * Parse file metadata and content from .yt file
 * @param filePath Path to .yt file
 * @returns Parsed file data or undefined if invalid
 */
export function parseYoutrackFile(filePath: string): YoutrackFileData | undefined {
  try {
    // Read and check file content
    if (!fs.existsSync(filePath)) {
      logger.error(`File does not exist: ${filePath}`)
      return undefined
    }

    const content = fs.readFileSync(filePath, "utf8")
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)

    if (!frontmatterMatch || frontmatterMatch.length < 3) {
      logger.error(`Invalid file format (missing frontmatter): ${filePath}`)
      return undefined
    }

    // Extract frontmatter and content
    const frontmatter = frontmatterMatch[1]
    const actualContent = frontmatterMatch[2].trim()

    // Parse YAML frontmatter
    const metadata = yaml.load(frontmatter) as Record<string, any>

    // Validate required fields
    if (!metadata?.idReadable || !metadata?.entityType) {
      logger.error(`Missing required metadata in file: ${filePath}`)
      return undefined
    }

    // Validate entityType
    const entityType = metadata.entityType as string
    if (entityType !== FILE_TYPE_ISSUE && entityType !== FILE_TYPE_ARTICLE) {
      logger.error(`Invalid entityType in file: ${filePath}, entityType: ${entityType}`)
      return undefined
    }

    // Create file data object
    const stats = fs.statSync(filePath)

    return {
      idReadable: metadata.idReadable,
      entityType: entityType as EditableEntityType,
      filePath,
      lastModified: stats.mtimeMs,
      syncStatus: FILE_STATUS_SYNC,
      projectKey: metadata.projectKey,
      metadata: {
        idReadable: metadata.idReadable,
        summary: metadata.summary || "",
        ...metadata,
      },
      content: actualContent,
    }
  } catch (error) {
    logger.error(`Error parsing file "${filePath}": ${error}`)
    return undefined
  }
}
