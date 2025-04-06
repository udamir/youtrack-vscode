import type * as vscode from "vscode"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../constants"
import { YouTrack } from "youtrack-client"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService {
  private client: YouTrack | null = null
  private baseUrl: string | undefined
  private token: string | undefined

  /**
   * Initialize the YouTrack client with credentials
   * @param context VSCode extension context
   * @returns True if initialization was successful
   */
  public async initialize(context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Try to get credentials from secrets storage first
      this.token = await context.secrets.get("youtrack-token")
      this.baseUrl = context.globalState.get<string>("youtrack-base-url")

      // If no stored credentials, try environment variables
      if (!this.token || !this.baseUrl) {
        this.baseUrl = process.env[ENV_YOUTRACK_BASE_URL]
        this.token = process.env[ENV_YOUTRACK_TOKEN]
      }

      // If still no credentials, client will remain null
      if (this.token && this.baseUrl) {
        this.client = YouTrack.client(this.baseUrl, this.token)
        return true
      }

      return false
    } catch (error) {
      console.error("Failed to initialize YouTrack client:", error)
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

      // Store credentials securely
      await context.secrets.store("youtrack-token", token)
      await context.globalState.update("youtrack-base-url", baseUrl)

      return true
    } catch (error) {
      console.error("Failed to set YouTrack credentials:", error)
      return false
    }
  }

  /**
   * Clear the stored credentials
   * @param context VSCode extension context
   */
  public async clearCredentials(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete("youtrack-token")
    await context.globalState.update("youtrack-base-url", undefined)
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
