import * as vscode from "vscode"
import type { ConfigurationService } from "../services/configuration"
import { TOKEN_STORAGE_SECURE, TOKEN_STORAGE_SETTINGS } from "../constants"
import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Validates configuration settings and displays appropriate messages for invalid settings
 */
export class SettingsValidator {
  constructor(private configuration: ConfigurationService) {}

  /**
   * Validate all settings and return result
   * @returns True if all settings are valid, false otherwise
   */
  public validateAll(): boolean {
    const urlValid = this.validateInstanceUrl()
    const tempFolderValid = this.validateTempFolder()
    const tokenStorageValid = this.validateTokenStorage()
    const cacheTimeoutValid = this.validateCacheTimeout()
    const recentItemsLimitValid = this.validateRecentItemsLimit()

    return urlValid && tempFolderValid && tokenStorageValid && cacheTimeoutValid && recentItemsLimitValid
  }

  /**
   * Validate YouTrack instance URL
   * @returns True if valid, false otherwise
   */
  public validateInstanceUrl(): boolean {
    const url = this.configuration.getInstanceUrl()

    if (!url || url.trim() === "") {
      return false
    }

    try {
      const parsedUrl = new URL(url)
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    } catch (error) {
      vscode.window.showErrorMessage("YouTrack instance URL is invalid. Please enter a valid URL.")
      return false
    }
  }

  /**
   * Validate token storage setting
   * @returns True if valid, false otherwise
   */
  public validateTokenStorage(): boolean {
    const tokenStorage = this.configuration.getTokenStorage()

    if (tokenStorage !== TOKEN_STORAGE_SECURE && tokenStorage !== TOKEN_STORAGE_SETTINGS) {
      vscode.window.showErrorMessage('Invalid token storage setting. Must be "secure" or "settings".')
      return false
    }

    return true
  }

  /**
   * Validate temporary folder path if specified
   * @returns True if valid, false otherwise
   */
  public validateTempFolder(): boolean {
    const folderPath = this.configuration.getTempFolderPath()

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
   * Validate cache timeout
   * @returns True if valid, false otherwise
   */
  public validateCacheTimeout(): boolean {
    const timeout = this.configuration.getCacheTimeout()

    if (isNaN(timeout) || timeout < 0) {
      vscode.window.showErrorMessage("Cache timeout must be a positive number.")
      return false
    }

    return true
  }

  /**
   * Validate recent items limit
   * @returns True if valid, false otherwise
   */
  public validateRecentItemsLimit(): boolean {
    const limit = this.configuration.getRecentItemsLimit()

    if (isNaN(limit) || limit < 1 || limit > 100) {
      vscode.window.showErrorMessage("Recent items limit must be between 1 and 100.")
      return false
    }

    return true
  }
}
