import type * as vscode from "vscode"
import type { YouTrack } from "youtrack-client"
import * as logger from "../utils/logger"
import { AuthenticationService, AuthState } from "./authentication"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService {
  private client: YouTrack | null = null
  private authService: AuthenticationService | null = null

  /**
   * Initialize the YouTrack client with credentials
   * @param context VSCode extension context
   * @returns True if initialization was successful
   */
  public async initialize(context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Initialize authentication service
      this.authService = new AuthenticationService(context)

      // Subscribe to auth state changes
      this.authService.onAuthStateChanged(this.handleAuthStateChange.bind(this))

      // Try to initialize authentication
      const success = await this.authService.initialize()

      // Update client reference if authentication was successful
      if (success) {
        this.client = this.authService.getClient()
      }

      return success
    } catch (error) {
      logger.error("Failed to initialize YouTrack client:", error)
      return false
    }
  }

  /**
   * Handle authentication state changes
   * @param state New authentication state
   * @private
   */
  private handleAuthStateChange(state: AuthState): void {
    if (state === AuthState.Authenticated && this.authService) {
      this.client = this.authService.getClient()
      logger.info("YouTrack client updated due to authentication state change")
    } else if (state === AuthState.NotAuthenticated || state === AuthState.AuthenticationFailed) {
      this.client = null
      logger.info("YouTrack client cleared due to authentication state change")
    }
  }

  /**
   * Check if the client is initialized with valid credentials
   */
  public isInitialized(): boolean {
    return this.client !== null && this.authService?.isAuthenticated() === true
  }

  /**
   * Set the YouTrack credentials
   * @param baseUrl YouTrack instance URL
   * @param token YouTrack permanent token
   * @param context VSCode extension context for storing credentials
   */
  public async setCredentials(baseUrl: string, token: string, context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Initialize auth service if needed
      if (!this.authService) {
        this.authService = new AuthenticationService(context)
        this.authService.onAuthStateChanged(this.handleAuthStateChange.bind(this))
      }

      // Authenticate with provided credentials
      const success = await this.authService.authenticate(baseUrl, token)

      // Update client reference if authentication was successful
      if (success) {
        this.client = this.authService.getClient()
      }

      return success
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
    // Initialize auth service if needed
    if (!this.authService) {
      this.authService = new AuthenticationService(context)
    }

    await this.authService.logout()
    this.client = null
  }

  /**
   * Get YouTrack client instance
   * @returns YouTrack client instance or null if not initialized
   */
  public getClient(): YouTrack | null {
    return this.client
  }

  /**
   * Get the current YouTrack base URL
   * @returns YouTrack base URL or undefined if not authenticated
   */
  public getBaseUrl(): string | undefined {
    return this.authService?.getBaseUrl()
  }
}
