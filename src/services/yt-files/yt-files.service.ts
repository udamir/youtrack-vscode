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
      this.vsCodeService.onDidChangeTempFolderPath(() => {
        logger.debug("yt-files.service: Temp directory changed")
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
      await vscode.window.showTextDocument(vscode.Uri.file(existingFile.filePath))
      return
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

      // Check if temp directory is configured
      if (!this._tempDirectory) {
        throw new Error("Temp directory not configured")
      }

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
