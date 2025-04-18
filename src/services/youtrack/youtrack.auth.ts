import type * as vscode from "vscode"
import { YouTrack } from "youtrack-client"
import * as logger from "../../utils/logger"
import { SecureStorageService } from "../vscode/vscode.storage"
import type { AuthState } from "./youtrack.types"
import {
  AUTHENTICATED,
  AUTHENTICATING,
  AUTHENTICATION_FAILED,
  NOT_AUTHENTICATED,
  USER_PROFILE_FIELDS,
} from "./youtrack.consts"

/**
 * Authentication service for managing YouTrack connection and session.
 */
export class AuthenticationService {
  private secureStorage: SecureStorageService
  private baseUrl: string | undefined
  private token: string | undefined
  private client: YouTrack | null = null
  private currentState: AuthState = NOT_AUTHENTICATED
  private onAuthStateChangedHandlers: ((state: AuthState) => void)[] = []

  /**
   * Create a new authentication service
   * @param context VSCode extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.secureStorage = new SecureStorageService(context)
  }

  /**
   * Get the current authentication state
   */
  public getAuthState(): AuthState {
    return this.currentState
  }

  /**
   * Get the authenticated YouTrack client instance
   * @returns YouTrack client instance or null if not authenticated
   */
  public getClient(): YouTrack | null {
    return this.client
  }

  /**
   * Get the current YouTrack base URL
   */
  public getBaseUrl(): string | undefined {
    return this.baseUrl
  }

  /**
   * Subscribe to authentication state changes
   * @param handler Function to call when authentication state changes
   * @returns Function to unsubscribe from events
   */
  public onAuthStateChanged(handler: (state: AuthState) => void): () => void {
    this.onAuthStateChangedHandlers.push(handler)

    // Return unsubscribe function
    return () => {
      const index = this.onAuthStateChangedHandlers.indexOf(handler)
      if (index !== -1) {
        this.onAuthStateChangedHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Initialize authentication from stored credentials or environment variables
   */
  public async initialize(): Promise<boolean> {
    try {
      this.updateAuthState(AUTHENTICATING)

      // Try to get credentials from secure storage first
      this.token = await this.secureStorage.getToken()
      this.baseUrl = this.secureStorage.getBaseUrl()

      if (this.token && this.baseUrl) {
        // Verify credentials are still valid
        logger.info(`Initializing with stored credentials for ${this.baseUrl}`)
        return await this.verifyAndCreateClient(this.baseUrl, this.token)
      }

      this.updateAuthState(NOT_AUTHENTICATED)
      return false
    } catch (error) {
      logger.error("Failed to initialize authentication:", error)
      this.updateAuthState(AUTHENTICATION_FAILED)
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

      // Set authenticating state first
      this.updateAuthState(AUTHENTICATING)

      if (!baseUrl || !token) {
        this.updateAuthState(AUTHENTICATION_FAILED)
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

        // Update auth state which will trigger event handlers
        this.updateAuthState(AUTHENTICATED)

        // Log successful authentication with potential server change
        if (isServerChange) {
          logger.info(`Successfully authenticated with new server. Changed from ${oldBaseUrl} to ${baseUrl}`)
        } else {
          logger.info(`Successfully authenticated with server at ${baseUrl}`)
        }

        return true
      }

      this.updateAuthState(AUTHENTICATION_FAILED)
      return false
    } catch (error) {
      logger.error("Authentication failed:", error)
      this.updateAuthState(AUTHENTICATION_FAILED)
      return false
    }
  }

  /**
   * Log out and clear stored credentials
   */
  public async logout(): Promise<void> {
    try {
      await this.secureStorage.clearCredentials()
      this.client = null
      this.baseUrl = undefined
      this.token = undefined
      this.updateAuthState(NOT_AUTHENTICATED)
    } catch (error) {
      logger.error("Logout failed:", error)
    }
  }

  /**
   * Check if user is currently authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentState === AUTHENTICATED && this.client !== null
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
      this.client = testClient
      this.updateAuthState(AUTHENTICATED)
      return true
    } catch (error) {
      logger.error("Credentials verification failed:", error)
      this.updateAuthState(AUTHENTICATION_FAILED)
      return false
    }
  }

  /**
   * Update authentication state and notify listeners
   * @param newState New authentication state
   * @private
   */
  private updateAuthState(newState: AuthState): void {
    if (this.currentState !== newState) {
      this.currentState = newState
      logger.info(`Authentication state changed to: ${newState}`)

      // Notify all handlers
      for (const handler of this.onAuthStateChangedHandlers) {
        try {
          handler(newState)
        } catch (error) {
          logger.error("Error in auth state change handler:", error)
        }
      }
    }
  }
}
