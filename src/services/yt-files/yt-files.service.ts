/**
 * File Editor Service
 * Handles creation, management, and synchronization of .yt files for YouTrack content editing
 */
import * as vscode from "vscode"
import * as path from "node:path"
import * as fs from "node:fs"
import * as logger from "../../utils/logger"
import { Disposable } from "../../utils/disposable"
import type { YouTrackService } from "../youtrack/youtrack.service"
import type { YoutrackFileData } from "./yt-files.types"
import { FILE_TYPE_ISSUE, YT_FILE_EXTENSION } from "./yt-files.consts"
import {
  scanYoutrackFiles,
  parseYoutrackFile,
  syncStatus,
  entityTypeById,
  generateFileName,
  writeYtFile,
} from "./yt-files.utils"
import type { VSCodeService } from "../vscode/vscode.service"
import type { ArticleEntity, IssueEntity } from "../../views"

/**
 * Service for managing local .yt files that contain YouTrack content
 */
export class YoutrackFilesService extends Disposable {
  private _tempDirectory: string | undefined
  private _fileWatcher: vscode.FileSystemWatcher | undefined
  private _onDidChangeEditedFiles = new vscode.EventEmitter<void>()

  // Map of edited files, keyed by entity ID
  private _editedFiles = new Map<string, YoutrackFileData>()
  private _ignoreFileChanges = new Set<string>()

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

    this._subscriptions.push(
      this.vsCodeService.onConnectionStatusChanged(() => {
        logger.debug("yt-files.service: Connection status changed")
        this.updateFilesStatus()
      }),
    )

    // Listen for configuration changes
    this._subscriptions.push(
      this.vsCodeService.onDidChangeTempFolderPath((newTempPath) => {
        logger.info(`yt-files.service: Temp directory changed to ${newTempPath}`)

        // Store current temp directory and edited files
        const oldTempDirectory = this._tempDirectory
        const existingFilesMap = new Map(this._editedFiles)
        const filesCount = existingFilesMap.size

        logger.info(`Current temp directory: ${oldTempDirectory}, files count: ${filesCount}`)

        // Update to new temp directory
        this._tempDirectory = newTempPath

        // Ensure the new directory exists
        try {
          fs.mkdirSync(newTempPath, { recursive: true })
          logger.info(`Created new temp directory at ${newTempPath}`)
        } catch (error) {
          logger.error(`Failed to create temp directory at ${newTempPath}:`, error)
        }

        // Re-initialize with new configuration
        if (this.isConfigured()) {
          logger.info("Service is configured, reinitializing with new temp folder")

          // First close any file watchers
          if (this._fileWatcher) {
            this._fileWatcher.dispose()
            this._fileWatcher = undefined
            logger.debug("Disposed existing file watcher")
          }

          // Initialize with the new folder
          this.initialize()

          // If we had files in the old directory, migrate them
          if (oldTempDirectory && oldTempDirectory !== newTempPath && filesCount > 0) {
            logger.info(`Migrating ${filesCount} files from ${oldTempDirectory} to ${newTempPath}`)
            vscode.window.showInformationMessage(
              `YouTrack: Migrating ${filesCount} files to new temp folder location...`,
            )
            this.migrateFilesToNewLocation(oldTempDirectory, newTempPath, existingFilesMap)
          } else {
            logger.info("No files to migrate or paths are the same")
          }
        } else {
          logger.warn("Service is not properly configured, skipping reinitialization")
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
   * Migrates files from old temp directory to new temp directory
   * @param oldDirectory The old temp directory path
   * @param newDirectory The new temp directory path
   * @param existingFiles Map of existing YouTrack files
   */
  private async migrateFilesToNewLocation(
    oldDirectory: string,
    newDirectory: string,
    existingFiles: Map<string, YoutrackFileData>,
  ): Promise<void> {
    logger.info(`Migrating YouTrack files from ${oldDirectory} to ${newDirectory}`)

    try {
      // Ensure the new directory exists
      fs.mkdirSync(newDirectory, { recursive: true })

      // Create a new map for the migrated files
      const migratedFiles = new Map<string, YoutrackFileData>()

      // Process each existing file
      for (const [entityId, fileData] of existingFiles.entries()) {
        try {
          const oldFilePath = fileData.filePath

          // Skip if old file doesn't exist
          if (!fs.existsSync(oldFilePath)) {
            continue
          }

          // Calculate the new file path
          const fileName = path.basename(oldFilePath)
          const newFilePath = path.join(newDirectory, fileName)

          // Read the content from old location
          const content = fs.readFileSync(oldFilePath, "utf8")

          // Add to ignore list to prevent triggering file watchers
          this._ignoreFileChanges.add(newFilePath)

          // Write to the new location
          fs.writeFileSync(newFilePath, content)

          // Update the file data with new path
          const updatedFileData = {
            ...fileData,
            filePath: newFilePath,
          }

          // Add to migrated files map
          migratedFiles.set(entityId, updatedFileData)

          logger.debug(`Migrated ${fileName} to new location`)

          // Remove from ignore list after short delay
          setTimeout(() => {
            this._ignoreFileChanges.delete(newFilePath)
          }, 1000)

          // Remove old file if successful
          if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(oldFilePath)
          }
        } catch (error) {
          logger.error(`Error migrating file for ${entityId}:`, error)
        }
      }

      // Update the edited files map with the migrated files
      this._editedFiles = migratedFiles

      // Notify about changes
      this._onDidChangeEditedFiles.fire()

      logger.info(`Successfully migrated ${migratedFiles.size} files to new temp folder`)
      vscode.window.showInformationMessage(
        `Successfully migrated ${migratedFiles.size} YouTrack files to new temp folder`,
      )
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error"
      logger.error("Failed to migrate files to new location:", error)
      vscode.window.showErrorMessage(`Failed to migrate YouTrack files to the new temp folder: ${errorMessage}`)
    }
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

        // Fetch issues/articles from YouTrack to check for conflicts
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

  private async updateFilesStatus(): Promise<void> {
    if (!this.youtrackService.isConnected()) {
      return
    }
    for (const fileData of this._editedFiles.values()) {
      await this.updateFileStatus(fileData)
    }
  }

  /**
   * Scan for existing .yt files in the temp directory
   */
  private async scanExistingFiles(): Promise<void> {
    logger.debug("yt-files.service: Scanning existing files")
    try {
      if (this._tempDirectory) {
        // Get all .yt files in the temp directory
        const files = scanYoutrackFiles(this._tempDirectory)

        logger.debug(`Found ${files.length} .yt files in temp directory`)

        // Clear current tracking
        this._editedFiles.clear()

        // Add each file entry to tracking
        for (const fileData of files) {
          const idReadable = fileData.metadata.idReadable
          this._editedFiles.set(idReadable, fileData)
        }

        // Update sync status for all files
        await this.updateFilesStatus()

        // Notify change
        this._onDidChangeEditedFiles.fire()
      }
    } catch (error) {
      logger.error(`Error scanning existing files: ${error}`)
    }
  }

  private async updateFileStatus(fileData: YoutrackFileData): Promise<IssueEntity | ArticleEntity | null> {
    const idReadable = fileData.metadata.idReadable
    logger.debug(`yt-files.service: Updating file status: ${idReadable}`)
    if (!this.youtrackService.isConnected()) {
      return null
    }
    const serverEntity: IssueEntity | ArticleEntity | null =
      entityTypeById(idReadable) === FILE_TYPE_ISSUE
        ? await this.youtrackService.getIssueById(idReadable)
        : await this.youtrackService.getArticleById(idReadable)
    if (serverEntity) {
      fileData.syncStatus = syncStatus(fileData, serverEntity)
    }
    return serverEntity
  }

  /**
   * Handle file change event
   * @param uri URI of the changed file
   */
  private async handleFileChange(uri: vscode.Uri): Promise<void> {
    // Ignore changes while saving
    if (this._ignoreFileChanges.has(uri.fsPath)) {
      this._ignoreFileChanges.delete(uri.fsPath)
      return
    }

    logger.debug(`yt-files.service: Handling file change: ${uri.fsPath}`)
    try {
      const fileData = parseYoutrackFile(uri.fsPath)

      if (fileData) {
        await this.updateFileStatus(fileData)
        this._editedFiles.set(fileData.metadata.idReadable, fileData)
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
    logger.debug(`yt-files.service: Deleting file: ${uri.fsPath}`)
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
   * @param projectKey Project key
   */
  public getEditedFilesForProject(projectKey: string): YoutrackFileData[] {
    return this.getEditedFiles().filter(({ metadata: { idReadable } }) => idReadable.startsWith(projectKey))
  }

  public getEditedFilesProjects(): string[] {
    return Array.from(new Set(this.getEditedFiles().map(({ metadata: { idReadable } }) => idReadable.split("-")[0])))
  }

  /**
   * Open an entity for editing
   * @param idReadable Entity ID
   */
  public async openInEditor(idReadable: string): Promise<void> {
    logger.debug(`yt-files.service: Opening in editor: ${idReadable}`)
    // Check if already open
    const existingFile = this._editedFiles.get(idReadable)
    if (existingFile) {
      // Check if the file exists at the path listed in our records
      if (fs.existsSync(existingFile.filePath)) {
        await vscode.window.showTextDocument(vscode.Uri.file(existingFile.filePath))
        return
      }

      // If we get here, file doesn't exist where expected - could have been moved or deleted
      // Remove it from our tracking and continue with recreation
      this._editedFiles.delete(idReadable)
    }

    const entityType = entityTypeById(idReadable)

    try {
      // Get entity details
      const entity =
        entityType === FILE_TYPE_ISSUE
          ? await this.youtrackService.getIssueById(idReadable)
          : await this.youtrackService.getArticleById(idReadable)

      if (!entity) {
        throw new Error(`Entity (${entityType}) not found: ${idReadable}`)
      }

      // Always get the latest temp directory from settings
      this._tempDirectory = this.vsCodeService.getTempFolderPath()

      // Check if temp directory is configured
      if (!this._tempDirectory) {
        throw new Error("Temp directory not configured")
      }

      // Ensure the directory exists
      fs.mkdirSync(this._tempDirectory, { recursive: true })

      // Create the file path
      const filePath = path.join(this._tempDirectory, generateFileName(entity))

      // Create or update the file
      await this.createOrUpdateFile(filePath, entity)

      // Track newly created file and notify views
      const newFileData = parseYoutrackFile(filePath)
      if (newFileData) {
        this._editedFiles.set(newFileData.metadata.idReadable, newFileData)
        this._onDidChangeEditedFiles.fire()
      }

      // Open the file in editor
      await vscode.window.showTextDocument(vscode.Uri.file(filePath))
    } catch (error) {
      logger.error(`Error opening ${entityType} editor: ${error}`)
      vscode.window.showErrorMessage(`Failed to open ${entityType}: ${error}`)
    }
  }

  /**
   * Fetch content from YouTrack and update the local file
   * @param fileInfo Information about the file to update
   */
  public async fetchFromYouTrack(fileInfo: YoutrackFileData): Promise<void> {
    logger.debug(`yt-files.service: Fetching from YouTrack: ${fileInfo.filePath}`)
    try {
      // Get updated entity from YouTrack
      const entity =
        fileInfo.entityType === FILE_TYPE_ISSUE
          ? await this.youtrackService.getIssueById(fileInfo.metadata.idReadable)
          : await this.youtrackService.getArticleById(fileInfo.metadata.idReadable)

      if (!entity) {
        throw new Error(`Entity not found: ${fileInfo.metadata.idReadable}`)
      }

      // Update the file
      await this.createOrUpdateFile(fileInfo.filePath, entity)
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
    logger.debug(`yt-files.service: Saving to YouTrack: ${fileInfo.filePath}`)
    try {
      // Read file content
      const content = fs.readFileSync(fileInfo.filePath, "utf8")
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)

      if (!match) {
        throw new Error("Invalid file format")
      }

      const { summary, idReadable } = fileInfo.metadata
      const [, , bodyContent] = match

      const updatedEntity =
        fileInfo.entityType === FILE_TYPE_ISSUE
          ? await this.youtrackService.updateIssueDescription(idReadable, bodyContent, summary)
          : await this.youtrackService.updateArticleContent(idReadable, bodyContent, summary)

      this._ignoreFileChanges.add(fileInfo.filePath)
      // Update file
      await this.createOrUpdateFile(fileInfo.filePath, updatedEntity)

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
   * @param entity The entity data
   */
  private async createOrUpdateFile(filePath: string, entity: IssueEntity | ArticleEntity): Promise<void> {
    logger.debug(`yt-files.service: Creating or updating file: ${filePath}`)
    try {
      const fileData = writeYtFile(filePath, entity)

      // Update tracking
      this._editedFiles.set(entity.idReadable, fileData)
      this._onDidChangeEditedFiles.fire()
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
    logger.debug(`yt-files.service: Unlinking file: ${fileInfo.filePath}`)
    try {
      // Delete file
      fs.unlinkSync(fileInfo.filePath)

      // Handle file deletion
      this.handleFileDelete(vscode.Uri.file(fileInfo.filePath))
    } catch (error) {
      logger.error(`Error unlinking file: ${error}`)
      vscode.window.showErrorMessage(`Failed to unlink file: ${error}`)
    }
  }
}
