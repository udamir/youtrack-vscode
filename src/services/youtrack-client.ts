import type * as vscode from "vscode"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../constants"
import { YouTrack } from "youtrack-client"
import { SecureStorageService } from "./secure-storage"
import * as logger from "../utils/logger"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService {
  private client: YouTrack | null = null
  private baseUrl: string | undefined
  private token: string | undefined
  private secureStorage: SecureStorageService | undefined

  /**
   * Initialize the YouTrack client with credentials
   * @param context VSCode extension context
   * @returns True if initialization was successful
   */
  public async initialize(context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Initialize secure storage service
      this.secureStorage = new SecureStorageService(context)

      // Try to get credentials from secure storage first
      this.token = await this.secureStorage.getToken()
      this.baseUrl = this.secureStorage.getBaseUrl()

      // If no stored credentials, try environment variables
      if (!this.token || !this.baseUrl) {
        this.baseUrl = process.env[ENV_YOUTRACK_BASE_URL]
        this.token = process.env[ENV_YOUTRACK_TOKEN]
      }

      // If still no credentials, client will remain null
      if (this.token && this.baseUrl) {
        // If we have credentials from environment variables, store them securely
        if (process.env[ENV_YOUTRACK_TOKEN] === this.token && this.secureStorage) {
          await this.secureStorage.storeToken(this.token)
          await this.secureStorage.storeBaseUrl(this.baseUrl)
          logger.info("Stored credentials from environment variables")
        }

        // Create the client
        this.client = YouTrack.client(this.baseUrl, this.token)
        return true
      }

      return false
    } catch (error) {
      logger.error("Failed to initialize YouTrack client:", error)
      return false
    }
  }

  /**
   * Check if the client is initialized with valid credentials
   */
  public isInitialized(): boolean {
    return this.client !== null
  }

  /**
   * Set the YouTrack credentials
   * @param baseUrl YouTrack instance URL
   * @param token YouTrack permanent token
   * @param context VSCode extension context for storing credentials
   */
  public async setCredentials(baseUrl: string, token: string, context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Create a test client to verify credentials
      const testClient = YouTrack.client(baseUrl, token)

      // Test the connection by fetching current user
      await testClient.Users.getCurrentUserProfile({
        fields: ["login", "email", "fullName"],
      })

      // If no error was thrown, save credentials
      this.baseUrl = baseUrl
      this.token = token
      this.client = testClient

      // Ensure secure storage is initialized
      if (!this.secureStorage) {
        this.secureStorage = new SecureStorageService(context)
      }

      // Store credentials securely
      await this.secureStorage.storeToken(token)
      await this.secureStorage.storeBaseUrl(baseUrl)

      return true
    } catch (error) {
      logger.error("Failed to set YouTrack credentials:", error)
      return false
    }
  }

  /**
   * Clear the stored credentials
   * @param context VSCode extension context
   */
  public async clearCredentials(context: vscode.ExtensionContext): Promise<void> {
    // Ensure secure storage is initialized
    if (!this.secureStorage) {
      this.secureStorage = new SecureStorageService(context)
    }

    await this.secureStorage.clearCredentials()
    this.client = null
    this.baseUrl = undefined
    this.token = undefined
  }

  /**
   * Get YouTrack client instance
   * @returns YouTrack client instance or null if not initialized
   */
  public getClient(): YouTrack | null {
    return this.client
  }
}
