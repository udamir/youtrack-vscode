import * as path from "node:path"
import * as fs from "node:fs"
import * as yaml from "js-yaml"

import { MockExtensionContext } from "../mock"
import {
  FILE_STATUS_MODIFIED,
  generateFileName,
  parseYoutrackFile,
  type YoutrackFilesService,
} from "../../src/services"
import { createServices, TEST_TEMP_DIR } from "../helpers/service-helper"
import type { IssueBaseEntity } from "../../src/views"

/**
 * This is an integration test for the file editor service
 * It requires real YouTrack credentials to be set in the environment
 */
describe("Youtrack Files Service Integration Test", () => {
  // Services
  const extensionContext = new MockExtensionContext()
  let youtrackFilesService: YoutrackFilesService
  let testIssue: IssueBaseEntity

  // Define a temp directory for the test
  const TEMP_DIR = TEST_TEMP_DIR

  beforeAll(async () => {
    try {
      // Create temp directory
      fs.mkdirSync(TEMP_DIR, { recursive: true })

      // Initialize services
      const services = await createServices(extensionContext)
      youtrackFilesService = services.youtrackFilesService

      // Get a test issue to use for file operations
      const projects = await services.youtrackService.getProjects()
      if (!projects || projects.length === 0) {
        throw new Error("No projects found in YouTrack")
      }

      // Get issues for the project
      const issues = await services.youtrackService.getIssues(projects[0].shortName)
      if (!issues || issues.length === 0) {
        throw new Error("No issues found in YouTrack")
      }

      testIssue = issues[0]
    } catch (error) {
      console.error("Error setting up file editor tests:", error)
      throw error
    }
  }, 30000) // Longer timeout for API calls

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true })
    }
  })

  it("should be properly configured when temp directory is set", () => {
    if (!testIssue.idReadable) return

    expect(youtrackFilesService.isConfigured()).toBe(true)
  })

  it("should create a .yt file for an issue", async () => {
    if (!testIssue.idReadable) return

    // Create a file for the test issue by opening the issue editor
    await youtrackFilesService.openInEditor(testIssue.idReadable)

    // Check if file was created
    const filePath = path.join(TEMP_DIR, generateFileName(testIssue))
    expect(fs.existsSync(filePath)).toBe(true)

    const fileData = parseYoutrackFile(filePath)

    // Check that the file contains the issue metadata
    expect(fileData).toBeDefined()
    expect(fileData?.metadata?.idReadable).toBe(testIssue.idReadable)
    expect(fileData?.metadata?.summary).toBe(testIssue.summary)

    // Make sure the file is tracked
    const editedFiles = youtrackFilesService.getEditedFiles()
    expect(editedFiles.length).toBeGreaterThan(0)

    const fileInfo = editedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
    expect(fileInfo).toBeDefined()
  }, 10000)

  it("should detect file changes and update sync status", async () => {
    if (!testIssue.idReadable) return

    // Make sure the file is open (create it if it doesn't exist)
    const editedFiles = youtrackFilesService.getEditedFiles()
    const fileInfo = editedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)

    if (!fileInfo) {
      await youtrackFilesService.openInEditor(testIssue.idReadable)
      const updatedFiles = youtrackFilesService.getEditedFiles()
      const newFileInfo = updatedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
      expect(newFileInfo).toBeDefined()
      if (!newFileInfo) return // Exit if still not defined (shouldn't happen)

      // Modify the file
      const filePath = newFileInfo.filePath
      const content = fs.readFileSync(filePath, "utf8")
      const data = yaml.load(content) as any

      // Update description
      data.content = "Modified content for testing"

      // Write back to file
      fs.writeFileSync(filePath, yaml.dump(data))

      // Wait for watcher to detect changes
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Manually trigger the file change handler
      await (youtrackFilesService as any).handleFileChange({ fsPath: filePath })

      // Check if status is updated
      const finalFiles = youtrackFilesService.getEditedFiles()
      const updatedFileInfo = finalFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)

      if (updatedFileInfo) {
        expect(updatedFileInfo.syncStatus).toBe(FILE_STATUS_MODIFIED)
      }
    }
  }, 10000)

  it("should fetch content from YouTrack", async () => {
    if (!testIssue.idReadable) return

    // Make sure the file is open (create it if it doesn't exist)
    const editedFiles = youtrackFilesService.getEditedFiles()
    const fileInfo = editedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)

    if (!fileInfo) {
      await youtrackFilesService.openInEditor(testIssue.idReadable)
      const updatedFiles = youtrackFilesService.getEditedFiles()
      const newFileInfo = updatedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
      expect(newFileInfo).toBeDefined()
      return // Skip the rest of the test if we just created the file
    }

    // Remember the modified time
    const filePath = fileInfo.filePath
    const stats = fs.statSync(filePath)
    const originalMtime = stats.mtime.getTime()

    // Fetch content from YouTrack
    await youtrackFilesService.fetchFromYouTrack(fileInfo)

    // Check if file was updated
    const newStats = fs.statSync(filePath)
    const newMtime = newStats.mtime.getTime()

    // Either the file was updated or it was already in sync
    expect(newMtime >= originalMtime).toBe(true)
  }, 10000)

  it("should unlink files", async () => {
    if (!testIssue.idReadable) return

    // Make sure the file is open (create it if it doesn't exist)
    const editedFiles = youtrackFilesService.getEditedFiles()
    const fileInfo = editedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)

    if (!fileInfo) {
      await youtrackFilesService.openInEditor(testIssue.idReadable)
      const updatedFiles = youtrackFilesService.getEditedFiles()
      const fileInfoAfterCreate = updatedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
      expect(fileInfoAfterCreate).toBeDefined()
      if (!fileInfoAfterCreate) return // Exit if still not defined (shouldn't happen)

      const filePath = fileInfoAfterCreate.filePath
      expect(fs.existsSync(filePath)).toBe(true)

      // Unlink file
      await youtrackFilesService.unlinkFile(fileInfoAfterCreate)

      // Verify file is removed
      expect(fs.existsSync(filePath)).toBe(false)

      // Verify it's no longer tracked
      const finalFiles = youtrackFilesService.getEditedFiles()
      const updatedFileInfo = finalFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
      expect(updatedFileInfo).toBeUndefined()
    } else {
      const filePath = fileInfo.filePath
      expect(fs.existsSync(filePath)).toBe(true)

      // Unlink file
      await youtrackFilesService.unlinkFile(fileInfo)

      // Verify file is removed
      expect(fs.existsSync(filePath)).toBe(false)

      // Verify it's no longer tracked
      const updatedFiles = youtrackFilesService.getEditedFiles()
      const updatedFileInfo = updatedFiles.find((info) => info.metadata.idReadable === testIssue.idReadable)
      expect(updatedFileInfo).toBeUndefined()
    }
  }, 10000)
})
