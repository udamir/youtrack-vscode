import * as vscode from "vscode"
import {
  CONFIG_INSTANCE_URL,
  CONFIG_CACHE_TIMEOUT,
  CONFIG_RECENT_ITEMS_LIMIT,
  CONFIG_TOKEN_STORAGE,
  CONFIG_TEMP_FOLDER_PATH,
  TOKEN_STORAGE_SECURE,
} from "../consts"
import * as path from "node:path"
import * as os from "node:os"

/**
 * Service for managing extension configuration
 */
export class ConfigurationService {
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
   * Get token storage method preference
   */
  public getTokenStorage(): string {
    return this.getValue<string>(CONFIG_TOKEN_STORAGE, TOKEN_STORAGE_SECURE)
  }

  /**
   * Set token storage method preference
   */
  public async setTokenStorage(storageMethod: string): Promise<void> {
    await this.updateValue(CONFIG_TOKEN_STORAGE, storageMethod)
  }

  /**
   * Get temp folder path for storing edited documents
   * Returns user-configured path or default temp directory
   */
  public getTempFolderPath(): string {
    const configuredPath = this.getValue<string>(CONFIG_TEMP_FOLDER_PATH, "")
    if (configuredPath && configuredPath.trim() !== "") {
      return configuredPath
    }

    // Default to system temp folder + youtrack subfolder
    return path.join(os.tmpdir(), "vscode-youtrack")
  }

  /**
   * Set temp folder path
   */
  public async setTempFolderPath(folderPath: string): Promise<void> {
    await this.updateValue(CONFIG_TEMP_FOLDER_PATH, folderPath)
  }

  /**
   * Get cache timeout in seconds
   */
  public getCacheTimeout(): number {
    return this.getValue<number>(CONFIG_CACHE_TIMEOUT, 300)
  }

  /**
   * Set cache timeout in seconds
   */
  public async setCacheTimeout(timeoutSeconds: number): Promise<void> {
    await this.updateValue(CONFIG_CACHE_TIMEOUT, timeoutSeconds)
  }

  /**
   * Get maximum number of recent items to display
   */
  public getRecentItemsLimit(): number {
    return this.getValue<number>(CONFIG_RECENT_ITEMS_LIMIT, 15)
  }

  /**
   * Set recent items limit
   */
  public async setRecentItemsLimit(limit: number): Promise<void> {
    await this.updateValue(CONFIG_RECENT_ITEMS_LIMIT, limit)
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
    const config = vscode.workspace.getConfiguration()
    return config.get<T>(key, defaultValue as T)
  }

  /**
   * Generic method to update a configuration value
   */
  private async updateValue(key: string, value: unknown): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    await config.update(key, value, vscode.ConfigurationTarget.Global)
  }
}
