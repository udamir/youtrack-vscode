/**
 * File Editor Service
 * Handles creation, management, and synchronization of .yt files for YouTrack content editing
 */
import * as vscode from "vscode"
import * as path from "node:path"
import * as fs from "node:fs"
import * as yaml from "js-yaml"
import * as logger from "../../utils/logger"
import { Disposable } from "../../utils/disposable"
import type { YouTrackService } from "../youtrack/youtrack.service"
import type { YoutrackFileData, EditableEntityType } from "./yt-files.types"
import {
  FILE_STATUS_SYNC,
  FILE_STATUS_MODIFIED,
  FILE_STATUS_CONFLICT,
  FILE_TYPE_ISSUE,
  FILE_TYPE_ARTICLE,
  YT_FILE_EXTENSION,
} from "./yt-files.consts"
import { scanYoutrackFiles, parseYoutrackFile } from "./yt-files.utils"
import type { VSCodeService } from "../vscode/vscode.service"

/**
 * Service for managing local .yt files that contain YouTrack content
 */
export class YoutrackFilesService extends Disposable {
  private _tempDirectory: string | undefined
  private _fileWatcher: vscode.FileSystemWatcher | undefined
  private _onDidChangeEditedFiles = new vscode.EventEmitter<void>()

  // Map of edited files, keyed by entity ID
  private _editedFiles = new Map<string, YoutrackFileData>()

  /**
   * Event that fires when the list of edited files changes
   */
  public readonly onDidChangeEditedFiles = this._onDidChangeEditedFiles.event

  /**
   * Creates an instance of the YoutrackFilesService
   * @param youtrackService YouTrack service instance
   */
  constructor(
    private readonly youtrackService: YouTrackService,
    private readonly vsCodeService: VSCodeService,
  ) {
    super()

    // Get temp directory from configuration
    this._tempDirectory = this.vsCodeService.getTempFolderPath()

    // Check if temp directory is configured
    if (this.isConfigured()) {
      this.initialize()
    }

    // Listen for configuration changes
    this._subscriptions.push(
      this.vsCodeService.onDidChangeTempFolderPath(() => {
        // Update temp directory
        this._tempDirectory = this.vsCodeService.getTempFolderPath()

        // Re-initialize if configuration changes
        if (this.isConfigured()) {
          this.initialize()
        }
      }),
    )
  }

  /**
   * Check if the service is configured
   */
  public isConfigured(): boolean {
    return !!this._tempDirectory
  }

  /**
   * Initialize the service
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure temp directory exists
      if (this._tempDirectory) {
        fs.mkdirSync(this._tempDirectory, { recursive: true })

        // Set up file watcher
        this.setupFileWatcher()

        // Scan for existing files
        await this.scanExistingFiles()
      }
    } catch (error) {
      logger.error(`Error initializing file editor service: ${error}`)
    }
  }

  /**
   * Set up the file watcher
   */
  private setupFileWatcher(): void {
    if (this._tempDirectory) {
      // Watch for changes in the temp directory
      this._fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this._tempDirectory, `*${YT_FILE_EXTENSION}`),
      )

      // Handle file changes
      this._subscriptions.push(this._fileWatcher.onDidChange((uri) => this.handleFileChange(uri)))

      // Handle file deletions
      this._subscriptions.push(this._fileWatcher.onDidDelete((uri) => this.handleFileDelete(uri)))

      // Add file watcher to disposables
      this._subscriptions.push(this._fileWatcher)
    }
  }

  /**
   * Scan for existing .yt files in the temp directory
   */
  private async scanExistingFiles(): Promise<void> {
    try {
      if (this._tempDirectory) {
        // Get all .yt files in the temp directory
        const files = scanYoutrackFiles(this._tempDirectory)

        // Clear current tracking
        this._editedFiles.clear()

        // Add each file entry to tracking
        for (const [filePath, fileData] of files.entries()) {
          try {
            this._editedFiles.set(fileData.metadata.id, fileData)
          } catch (error) {
            logger.error(`Error processing YouTrack file ${filePath}: ${error}`)
          }
        }

        // Notify change
        this._onDidChangeEditedFiles.fire()
      }
    } catch (error) {
      logger.error(`Error scanning existing files: ${error}`)
    }
  }

  /**
   * Handle file change event
   * @param uri URI of the changed file
   */
  private async handleFileChange(uri: vscode.Uri): Promise<void> {
    try {
      // Parse the changed file
      const fileData = parseYoutrackFile(uri.fsPath)

      if (fileData) {
        // Update tracking with new data
        this._editedFiles.set(fileData.metadata.id, fileData)

        // Notify change
        this._onDidChangeEditedFiles.fire()
      }
    } catch (error) {
      logger.error(`Error handling file change: ${error}`)
    }
  }

  /**
   * Handle file delete event
   * @param uri URI of the deleted file
   */
  private handleFileDelete(uri: vscode.Uri): void {
    try {
      // Find all file infos that match this path
      const idsToRemove: string[] = []

      for (const [id, file] of this._editedFiles.entries()) {
        if (file.filePath === uri.fsPath) {
          idsToRemove.push(id)
        }
      }

      // Remove identified files
      idsToRemove.forEach((id) => this._editedFiles.delete(id))

      // Notify change
      this._onDidChangeEditedFiles.fire()
    } catch (error) {
      logger.error(`Error handling file delete: ${error}`)
    }
  }

  /**
   * Get all currently edited files
   */
  public getEditedFiles(): YoutrackFileData[] {
    return Array.from(this._editedFiles.values())
  }

  /**
   * Get edited files for a specific project
   * @param projectId Project ID
   */
  public getEditedFilesForProject(projectId: string): YoutrackFileData[] {
    return this.getEditedFiles().filter((fileInfo) => fileInfo.projectKey === projectId)
  }

  /**
   * Open an issue for editing
   * @param issueId Issue ID
   */
  public async openIssueEditor(issueId: string): Promise<void> {
    try {
      // Check if already open
      const existingFile = this._editedFiles.get(issueId)
      if (existingFile) {
        await vscode.window.showTextDocument(vscode.Uri.file(existingFile.filePath))
        return
      }

      // Get issue details
      const issue = await this.youtrackService.getIssueById(issueId)

      if (!issue) {
        throw new Error(`Issue not found: ${issueId}`)
      }

      // Check if temp directory is configured
      if (!this._tempDirectory) {
        throw new Error("Temp directory not configured")
      }

      // Create the file path
      const fileName = `${issue.idReadable}${YT_FILE_EXTENSION}`
      const filePath = path.join(this._tempDirectory, fileName)

      // Create or update the file
      await this.createOrUpdateFile(filePath, FILE_TYPE_ISSUE, issue)

      // Open the file in editor
      await vscode.window.showTextDocument(vscode.Uri.file(filePath))
    } catch (error) {
      logger.error(`Error opening issue editor: ${error}`)
      vscode.window.showErrorMessage(`Failed to open issue: ${error}`)
    }
  }

  /**
   * Open an article for editing
   * @param articleId Article ID
   */
  public async openArticleEditor(articleId: string): Promise<void> {
    try {
      // Check if already open
      const existingFile = this._editedFiles.get(articleId)
      if (existingFile) {
        await vscode.window.showTextDocument(vscode.Uri.file(existingFile.filePath))
        return
      }

      // Get article details
      const article = await this.youtrackService.getArticleById(articleId)

      if (!article) {
        throw new Error(`Article not found: ${articleId}`)
      }

      // Check if temp directory is configured
      if (!this._tempDirectory) {
        throw new Error("Temp directory not configured")
      }

      // Create the file path
      const fileName = `KB-${article.id}${YT_FILE_EXTENSION}`
      const filePath = path.join(this._tempDirectory, fileName)

      // Create or update the file
      await this.createOrUpdateFile(filePath, FILE_TYPE_ARTICLE, article)

      // Open the file in editor
      await vscode.window.showTextDocument(vscode.Uri.file(filePath))
    } catch (error) {
      logger.error(`Error opening article editor: ${error}`)
      vscode.window.showErrorMessage(`Failed to open article: ${error}`)
    }
  }

  /**
   * Fetch content from YouTrack and update the local file
   * @param fileInfo Information about the file to update
   */
  public async fetchFromYouTrack(fileInfo: YoutrackFileData): Promise<void> {
    try {
      // Get updated entity from YouTrack
      let entity: any

      if (fileInfo.entityType === FILE_TYPE_ISSUE) {
        entity = await this.youtrackService.getIssueById(fileInfo.metadata.id)
      } else {
        entity = await this.youtrackService.getArticleById(fileInfo.metadata.id)
      }

      if (!entity) {
        throw new Error(`Entity not found: ${fileInfo.metadata.id}`)
      }

      // Update the file
      await this.createOrUpdateFile(fileInfo.filePath, fileInfo.entityType, entity)

      // Update tracking
      const updatedFileData = parseYoutrackFile(fileInfo.filePath)
      if (updatedFileData) {
        this._editedFiles.set(updatedFileData.metadata.id, updatedFileData)
        this._onDidChangeEditedFiles.fire()
      }
    } catch (error) {
      logger.error(`Error fetching from YouTrack: ${error}`)
      vscode.window.showErrorMessage(`Failed to fetch from YouTrack: ${error}`)
    }
  }

  /**
   * Save changes to YouTrack
   * @param fileInfo Information about the file to save
   */
  public async saveToYouTrack(fileInfo: YoutrackFileData): Promise<boolean> {
    try {
      // Read file content
      const content = fs.readFileSync(fileInfo.filePath, "utf8")
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)

      if (!match) {
        throw new Error("Invalid file format")
      }

      const [, , bodyContent] = match

      if (fileInfo.entityType === FILE_TYPE_ISSUE) {
        // Update issue
        await this.youtrackService.updateIssueDescription(
          fileInfo.metadata.id,
          bodyContent.trim(),
          fileInfo.metadata.summary,
        )
      } else {
        // Update article
        await this.youtrackService.updateArticleContent(
          fileInfo.metadata.id,
          bodyContent.trim(),
          fileInfo.metadata.summary,
        )
      }

      // Update file status
      const updatedFileData = parseYoutrackFile(fileInfo.filePath)
      if (updatedFileData) {
        this._editedFiles.set(updatedFileData.metadata.id, updatedFileData)
        this._onDidChangeEditedFiles.fire()
      }

      return true
    } catch (error) {
      logger.error(`Error saving to YouTrack: ${error}`)
      vscode.window.showErrorMessage(`Failed to save to YouTrack: ${error}`)
      return false
    }
  }

  /**
   * Create or update a file with entity content
   * @param filePath Path to the file
   * @param entityType Type of entity (issue or article)
   * @param entity The entity data
   */
  private async createOrUpdateFile(filePath: string, entityType: EditableEntityType, entity: any): Promise<void> {
    try {
      // Prepare frontmatter
      const frontmatter: Record<string, any> = {
        entityType,
      }

      if (entityType === FILE_TYPE_ISSUE) {
        const issue = entity as any
        frontmatter.id = issue.id
        frontmatter.idReadable = issue.idReadable
        frontmatter.summary = issue.summary
        frontmatter.projectKey = issue.project?.shortName
      } else {
        const article = entity as any
        frontmatter.id = article.id
        frontmatter.summary = article.summary
        frontmatter.projectKey = article.projectId
      }

      // Get content based on entity type
      const content = entityType === FILE_TYPE_ISSUE ? (entity as any).description || "" : (entity as any).content || ""

      // Create frontmatter string
      const frontmatterYaml = yaml.dump(frontmatter)

      // Write file
      const fileContent = `---\n${frontmatterYaml}---\n\n${content}`
      fs.writeFileSync(filePath, fileContent, "utf8")

      // Parse and update tracking
      const fileData = parseYoutrackFile(filePath)
      if (fileData) {
        this._editedFiles.set(fileData.metadata.id, fileData)
        this._onDidChangeEditedFiles.fire()
      }
    } catch (error) {
      logger.error(`Error creating/updating file: ${error}`)
      throw error
    }
  }

  /**
   * Unlink a file from tracking and delete it
   * @param fileInfo Information about the file to unlink
   */
  public async unlinkFile(fileInfo: YoutrackFileData): Promise<void> {
    try {
      // Delete file
      fs.unlinkSync(fileInfo.filePath)

      // Remove from tracking
      const idsToRemove: string[] = []

      for (const [id, file] of this._editedFiles.entries()) {
        if (file.filePath === fileInfo.filePath) {
          idsToRemove.push(id)
        }
      }

      // Remove identified files
      idsToRemove.forEach((id) => this._editedFiles.delete(id))

      // Notify change
      this._onDidChangeEditedFiles.fire()
    } catch (error) {
      logger.error(`Error unlinking file: ${error}`)
      vscode.window.showErrorMessage(`Failed to unlink file: ${error}`)
    }
  }
}

// Export status constants for backward compatibility and tests
export { FILE_STATUS_SYNC, FILE_STATUS_MODIFIED, FILE_STATUS_CONFLICT }
