import { YouTrack } from "youtrack-client"
import * as logger from "../../utils/logger"
import type { SecureStorageService } from "../vscode"
import { USER_PROFILE_FIELDS } from "./youtrack.consts"

/**
 * Authentication service for managing YouTrack connection and session.
 */
export class AuthenticationService {
  private baseUrl: string | undefined
  private token: string | undefined
  private _client: YouTrack | null = null

  /**
   * Create a new authentication service
   * @param secureStorage Secure storage service
   */
  constructor(private secureStorage: SecureStorageService) {}

  /**
   * Get the authenticated YouTrack client instance
   * @returns YouTrack client instance or null if not authenticated
   */
  public get client(): YouTrack | null {
    return this._client
  }

  /**
   * Get the current YouTrack base URL
   */
  public getBaseUrl(): string | undefined {
    return this.baseUrl
  }

  /**
   * Check if user is currently authenticated
   */
  public get isAuthenticated(): boolean {
    return this._client !== null
  }

  /**
   * Initialize authentication from stored credentials or environment variables
   */
  public async initialize(): Promise<boolean> {
    try {
      // Try to get credentials from secure storage first
      this.token = await this.secureStorage.getToken()
      this.baseUrl = this.secureStorage.getBaseUrl()

      if (this.token && this.baseUrl) {
        // Verify credentials are still valid
        logger.info(`Initializing with stored credentials for ${this.baseUrl}`)
        return await this.verifyAndCreateClient(this.baseUrl, this.token)
      }

      return false
    } catch (error) {
      logger.error("Failed to initialize authentication:", error)
      return false
    }
  }

  /**
   * Authenticate with YouTrack using a permanent token
   * @param baseUrl YouTrack instance URL
   * @param token YouTrack permanent token
   * @returns True if authentication was successful
   */
  public async authenticate(baseUrl: string, token: string): Promise<boolean> {
    try {
      logger.info(`Authenticating to YouTrack at ${baseUrl}, previous URL: ${this.baseUrl || "none"}`)

      // Detect server URL change
      const isServerChange = this.baseUrl !== undefined && this.baseUrl !== baseUrl
      if (isServerChange) {
        logger.info(`Server URL changing from ${this.baseUrl} to ${baseUrl}`)
      }

      if (!baseUrl || !token) {
        return false
      }

      // Verify credentials are valid
      const success = await this.verifyAndCreateClient(baseUrl, token)

      if (success) {
        // Save credentials
        await this.secureStorage.storeToken(token)
        await this.secureStorage.storeBaseUrl(baseUrl)

        // Important: Update instance variables before firing the authenticated event
        // This ensures that getBaseUrl() returns the new URL when handlers process the event
        const oldBaseUrl = this.baseUrl
        this.baseUrl = baseUrl
        this.token = token

        // Log successful authentication with potential server change
        if (isServerChange) {
          logger.info(`Successfully authenticated with new server. Changed from ${oldBaseUrl} to ${baseUrl}`)
        } else {
          logger.info(`Successfully authenticated with server at ${baseUrl}`)
        }

        return true
      }

      return false
    } catch (error) {
      logger.error("Authentication failed:", error)
      return false
    }
  }

  /**
   * Log out and clear stored credentials
   */
  public async logout(): Promise<void> {
    try {
      await this.secureStorage.clearCredentials()
      this._client = null
      this.baseUrl = undefined
      this.token = undefined
    } catch (error) {
      logger.error("Logout failed:", error)
    }
  }

  /**
   * Verify credentials by connecting to YouTrack and create client if valid
   * @param baseUrl YouTrack instance URL
   * @param token YouTrack permanent token
   * @private
   */
  private async verifyAndCreateClient(baseUrl: string, token: string): Promise<boolean> {
    try {
      // Create a test client to verify credentials
      const testClient = YouTrack.client(baseUrl, token)

      // Test the connection by fetching current user
      await testClient.Users.getCurrentUserProfile({
        fields: USER_PROFILE_FIELDS,
      })

      // If no error was thrown, credentials are valid
      this._client = testClient
      return true
    } catch (error) {
      logger.error("Credentials verification failed:", error)
      this._client = null
      return false
    }
  }
}
