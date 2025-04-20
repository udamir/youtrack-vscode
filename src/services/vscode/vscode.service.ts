import * as vscode from "vscode"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

import * as logger from "../../utils/logger"
import {
  CONFIG_INSTANCE_URL,
  CONFIG_RECENT_ITEMS_LIMIT,
  CONFIG_TOKEN_STORAGE,
  EXTENSION_NAME,
  CONFIG_TEMP_FOLDER_PATH,
  STATUS_CONNECTED,
  TOKEN_STORAGE_SETTINGS,
  TOKEN_STORAGE_SECURE,
  STATUS_AUTHENTICATED,
} from "./vscode.consts"
import { Disposable } from "../../utils/disposable"
import type { ProjectEntity } from "../../views"
import { SecureStorageService } from "./vscode-storage.service"
import type { ConnectionStatus } from "./vscode.types"

/**
 * Service for managing extension configuration
 */
export class VSCodeService extends Disposable {
  public readonly config = vscode.workspace.getConfiguration()
  private readonly _secureStorage: SecureStorageService

  // State
  private _activeProject?: ProjectEntity
  private _baseUrl?: string

  // Event emitters to notify components of state changes
  private readonly _onDidChangeTempFolderPath = new vscode.EventEmitter<string>()
  private readonly _onDidChangeActiveProject = new vscode.EventEmitter<ProjectEntity | undefined>()
  private readonly _onDidRefreshViews = new vscode.EventEmitter<void>()
  private readonly _onServerChanged = new vscode.EventEmitter<string | undefined>()
  private readonly _onConnectionStatusChanged = new vscode.EventEmitter<ConnectionStatus>()

  // Public events that components can subscribe to
  public readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event
  public readonly onDidRefreshViews = this._onDidRefreshViews.event
  public readonly onServerChanged = this._onServerChanged.event
  public readonly onDidChangeTempFolderPath = this._onDidChangeTempFolderPath.event
  public readonly onConnectionStatusChanged = this._onConnectionStatusChanged.event

  constructor(private readonly _context: vscode.ExtensionContext) {
    super()

    this._secureStorage = new SecureStorageService(this._context)

    this._subscriptions.push(this._onServerChanged)
    this._subscriptions.push(this._onDidChangeActiveProject)
    this._subscriptions.push(this._onDidRefreshViews)
    this._subscriptions.push(this._onDidChangeTempFolderPath)
    this._subscriptions.push(this._onConnectionStatusChanged)

    // Listen for configuration changes
    this._subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(CONFIG_TEMP_FOLDER_PATH)) {
          this._onDidChangeTempFolderPath.fire(this.getTempFolderPath())
        }
      }),
    )
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }

  public get activeProjectKey(): string | undefined {
    return this._activeProject?.shortName
  }

  public get secureStorage(): SecureStorageService {
    return this._secureStorage
  }

  public get workspaceState(): vscode.Memento {
    return this._context.workspaceState
  }

  public changeConnectionStatus(status: ConnectionStatus, baseUrl?: string): void {
    this._onConnectionStatusChanged.fire(status)

    if (status === STATUS_AUTHENTICATED && this._baseUrl !== baseUrl) {
      this._onServerChanged.fire(baseUrl)
    }

    this._baseUrl = baseUrl
  }

  public changeActiveProject(project?: ProjectEntity): void {
    // Notify about the change
    this._activeProject = project
    this._onDidChangeActiveProject.fire(project)
  }

  /**
   * Fire the refresh views event to refresh all views
   */
  public refreshViews(): void {
    logger.info("Firing refresh views event")
    this._onDidRefreshViews.fire()
  }

  /**
   * Toggle the visibility of views based on configuration state
   * @param isConfigured Whether the extension is configured
   */
  public async toggleViewsVisibility(isConfigured: boolean): Promise<void> {
    logger.info(`Toggling views visibility. isConfigured=${isConfigured}`)

    // Update context to control view visibility based on connection status
    await vscode.commands.executeCommand("setContext", STATUS_CONNECTED, isConfigured)

    if (isConfigured) {
      // If configured, refresh everything to make sure the latest data is shown
      this.refreshViews()
    }
  }

  /**
   * Validate all settings
   * @returns True if all settings are valid, false otherwise
   */
  public validateSettings(): boolean {
    const urlValid = this.validateInstanceUrl()
    const tempFolderValid = this.validateTempFolder()
    const tokenStorageValid = this.validateTokenStorage()
    const recentItemsLimitValid = this.validateRecentItemsLimit()

    return urlValid && tempFolderValid && tokenStorageValid && recentItemsLimitValid
  }

  /**
   * Validate YouTrack instance URL
   * @returns True if valid, false otherwise
   */
  public validateInstanceUrl(): boolean {
    const url = this.getInstanceUrl()

    if (!url) {
      vscode.window.showErrorMessage("YouTrack instance URL is not configured.")
      return false
    }

    // Basic URL validation
    try {
      const parsedUrl = new URL(url)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        vscode.window.showErrorMessage("YouTrack instance URL must use http or https protocol.")
        return false
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Invalid YouTrack instance URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      return false
    }

    return true
  }

  /**
   * Validate token storage method
   * @returns True if valid, false otherwise
   */
  public validateTokenStorage(): boolean {
    const storage = this.getTokenStorage()

    if (storage !== TOKEN_STORAGE_SECURE && storage !== TOKEN_STORAGE_SETTINGS) {
      vscode.window.showErrorMessage("Invalid token storage method.")
      return false
    }

    return true
  }

  /**
   * Validate temporary folder path if specified
   * @returns True if valid, false otherwise
   */
  public validateTempFolder(): boolean {
    const folderPath = this.getTempFolderPath()

    // If using default path, no validation needed
    if (!folderPath || folderPath.includes(path.join("vscode-youtrack"))) {
      return true
    }

    try {
      // Check if path exists and is a directory
      const stats = fs.statSync(folderPath)
      if (!stats.isDirectory()) {
        vscode.window.showErrorMessage("Temporary folder path exists but is not a directory.")
        return false
      }

      // Check write permissions by attempting to create a test file
      const testFile = path.join(folderPath, ".youtrack-test-permissions")
      fs.writeFileSync(testFile, "test")
      fs.unlinkSync(testFile)

      return true
    } catch (error) {
      vscode.window.showErrorMessage(
        `Cannot access temporary folder: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      return false
    }
  }

  /**
   * Validate recent items limit
   * @returns True if valid, false otherwise
   */
  public validateRecentItemsLimit(): boolean {
    const limit = this.getRecentItemsLimit()

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      vscode.window.showErrorMessage("Recent items limit must be between 1 and 100.")
      return false
    }

    return true
  }

  /**
   * Get YouTrack instance URL from settings
   */
  public getInstanceUrl(): string | undefined {
    return this.getValue<string>(CONFIG_INSTANCE_URL)
  }

  /**
   * Set YouTrack instance URL in settings
   */
  public async setInstanceUrl(url: string): Promise<void> {
    await this.updateValue(CONFIG_INSTANCE_URL, url)
  }

  /**
   * Get temp folder path for storing edited documents
   * Returns user-configured path or default temp directory
   */
  public getTempFolderPath(): string {
    const configuredPath = this.getValue<string>(CONFIG_TEMP_FOLDER_PATH, "")
    if (configuredPath && configuredPath.trim() !== "") {
      return this.ensureDirectoryExists(configuredPath)
    }

    // Get extension directory - typically the workspace root in development
    const extensionPath = vscode.extensions.getExtension(EXTENSION_NAME)?.extensionUri.fsPath || ""

    // If extension path is available, use its temp subfolder
    if (extensionPath) {
      const tempFolder = path.join(extensionPath, "temp")
      return this.ensureDirectoryExists(tempFolder)
    }

    // Fallback to system temp folder + youtrack subfolder if extension path is not available
    const defaultTempFolder = path.join(os.tmpdir(), "vscode-youtrack")
    return this.ensureDirectoryExists(defaultTempFolder)
  }

  /**
   * Ensures the specified directory exists, creating it if needed
   * @param dirPath Path to the directory
   * @returns The same directory path
   */
  private ensureDirectoryExists(dirPath: string): string {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error)
    }
    return dirPath
  }

  /**
   * Set temp folder path
   */
  public async setTempFolderPath(folderPath: string): Promise<void> {
    await this.updateValue(CONFIG_TEMP_FOLDER_PATH, folderPath)
    this._onDidChangeTempFolderPath.fire(folderPath)
  }

  /**
   * Get maximum number of recent items to display
   */
  public getRecentItemsLimit(): number {
    return this.getValue<number>(CONFIG_RECENT_ITEMS_LIMIT, 10)
  }

  /**
   * Set recent items limit
   */
  public async setRecentItemsLimit(limit: number): Promise<void> {
    await this.updateValue(CONFIG_RECENT_ITEMS_LIMIT, limit)
  }

  /**
   * Get preferred token storage method
   */
  public getTokenStorage(): string {
    return this.getValue<string>(CONFIG_TOKEN_STORAGE, TOKEN_STORAGE_SECURE)
  }

  /**
   * Set preferred token storage method
   */
  public async setTokenStorage(storage: string): Promise<void> {
    await this.updateValue(CONFIG_TOKEN_STORAGE, storage)
  }

  /**
   * Check if configuration is complete with required settings
   */
  public isConfigured(): boolean {
    const instanceUrl = this.getInstanceUrl()
    return instanceUrl !== undefined && instanceUrl.trim() !== ""
  }

  /**
   * Generic method to get a configuration value
   */
  private getValue<T>(key: string, defaultValue?: T): T {
    return this.config.get<T>(key, defaultValue as T)
  }

  /**
   * Generic method to update a configuration value
   */
  private async updateValue(key: string, value: unknown): Promise<void> {
    await this.config.update(key, value, vscode.ConfigurationTarget.Global)
  }
}
