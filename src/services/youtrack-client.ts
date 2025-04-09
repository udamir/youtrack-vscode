import type * as vscode from "vscode"
import { EventEmitter } from "vscode"
import type { YouTrack } from "youtrack-client"
import * as logger from "../utils/logger"
import { AuthenticationService, AuthState } from "./authentication"
import type { Project } from "../models/project"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService {
  private client: YouTrack | null = null
  private _authService: AuthenticationService | null = null
  private previousBaseUrl: string | undefined
  private readonly _onServerChanged = new EventEmitter<string | undefined>()

  /**
   * Event fired when the YouTrack server changes
   */
  public readonly onServerChanged = this._onServerChanged.event

  /**
   * Initialize the YouTrack client with credentials
   * @param context VSCode extension context
   * @returns True if initialization was successful
   */
  public async initialize(context: vscode.ExtensionContext): Promise<boolean> {
    try {
      // Initialize authentication service
      this._authService = new AuthenticationService(context)

      // Subscribe to auth state changes
      this._authService.onAuthStateChanged(this.handleAuthStateChange.bind(this))

      // Try to initialize authentication
      const success = await this._authService.initialize()

      // Update client reference if authentication was successful
      if (success) {
        this.client = this._authService.getClient()

        // Force a server change event on initialization
        const currentBaseUrl = this._authService.getBaseUrl()
        if (currentBaseUrl) {
          logger.info(`Forcing server change event during initialization for ${currentBaseUrl}`)
          this._onServerChanged.fire(currentBaseUrl)
          this.previousBaseUrl = currentBaseUrl
        }
      }

      return success
    } catch (error) {
      logger.error("Failed to initialize YouTrack client:", error)
      return false
    }
  }

  /**
   * Get the authentication service instance
   * @returns The authentication service instance or null if not initialized
   */
  public get authService(): AuthenticationService | null {
    return this._authService
  }

  /**
   * Get the current YouTrack base URL
   * @returns The base URL or undefined if not connected
   */
  public getBaseUrl(): string | undefined {
    return this._authService?.getBaseUrl()
  }

  /**
   * Handle authentication state changes
   * @param state New authentication state
   * @private
   */
  private handleAuthStateChange(state: AuthState): void {
    if (state === AuthState.Authenticated && this._authService) {
      this.client = this._authService.getClient()

      // Get the current base URL
      const currentBaseUrl = this._authService.getBaseUrl()
      logger.info(
        `Authentication state changed to Authenticated. Current base URL: ${currentBaseUrl}, Previous base URL: ${this.previousBaseUrl || "none"}`,
      )

      // First time authentication or different server
      if (!this.previousBaseUrl || currentBaseUrl !== this.previousBaseUrl) {
        logger.info(
          `Server URL changed from ${this.previousBaseUrl || "none"} to ${currentBaseUrl}, firing server change event`,
        )

        // Always fire the server change event
        this._onServerChanged.fire(currentBaseUrl)

        // Update the previous base URL after firing the event
        this.previousBaseUrl = currentBaseUrl
      } else {
        logger.info("Server URL unchanged, no event fired")
      }

      logger.info("YouTrack client updated due to authentication state change")
    } else if (state === AuthState.NotAuthenticated || state === AuthState.AuthenticationFailed) {
      this.client = null

      // If we were previously authenticated and are now disconnected
      if (this.previousBaseUrl) {
        logger.info("Server disconnected, clearing previous URL")
        this._onServerChanged.fire(undefined)
        this.previousBaseUrl = undefined
      }

      logger.info("YouTrack client cleared due to authentication state change")
    }
  }

  /**
   * Set the YouTrack credentials
   * @param baseUrl YouTrack instance URL
   * @param token YouTrack permanent token
   * @param context VSCode extension context for storing credentials
   */
  public async setCredentials(baseUrl: string, token: string, context: vscode.ExtensionContext): Promise<boolean> {
    try {
      logger.info(`Setting credentials for ${baseUrl}, previous URL: ${this.previousBaseUrl || "none"}`)

      // Check if this is a different server than previously used
      const isServerChange = baseUrl !== this.previousBaseUrl && this.previousBaseUrl !== undefined

      // Initialize auth service if needed
      if (!this._authService) {
        this._authService = new AuthenticationService(context)
        this._authService.onAuthStateChanged(this.handleAuthStateChange.bind(this))
      }

      // Authenticate with provided credentials
      const success = await this._authService.authenticate(baseUrl, token)

      // Update client reference if authentication was successful
      if (success) {
        this.client = this._authService.getClient()

        // If this is a different server than before, explicitly fire a server change event
        if (isServerChange) {
          logger.info(`Explicitly firing server change event: ${this.previousBaseUrl} -> ${baseUrl}`)
          this._onServerChanged.fire(baseUrl)
          this.previousBaseUrl = baseUrl
        }
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
    if (!this._authService) {
      this._authService = new AuthenticationService(context)
    }

    await this._authService.logout()
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
   * Check if YouTrack is properly configured with valid credentials
   * @returns True if YouTrack is configured with valid credentials
   */
  public isConnected(): boolean {
    return this.client !== null && this.authService?.isAuthenticated() === true
  }

  /**
   * Gets all available projects from YouTrack
   * @returns Array of Project objects
   */
  public async getProjects(): Promise<Project[]> {
    try {
      const client = this.getClient()
      if (!client) {
        throw new Error("YouTrack client is not initialized")
      }

      // Fetch projects from the YouTrack client
      return (await client.Admin.Projects.getProjects({
        fields: ["id", "name", "shortName", "description", "iconUrl"],
      })) as Project[]
    } catch (error) {
      logger.error("Error fetching projects from YouTrack:", error)
      throw error
    }
  }

  /**
   * Gets available projects that are not in the selected projects list
   * @param selectedProjectIds Array of IDs of already selected projects
   * @returns Array of available Project objects
   */
  public async getAvailableProjects(selectedProjectIds: string[]): Promise<Project[]> {
    try {
      const allProjects = await this.getProjects()

      // Filter out already selected projects
      return allProjects.filter((project: Project) => !selectedProjectIds.includes(project.id))
    } catch (error) {
      logger.error("Error fetching available projects from YouTrack:", error)
      throw error
    }
  }

  /**
   * Gets a project by its ID
   * @param projectId ID of the project to get
   * @returns Project object or null if not found
   */
  public async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const client = this.getClient()
      if (!client) {
        throw new Error("YouTrack client is not initialized")
      }

      // Get project details from YouTrack
      return (await client.Admin.Projects.getProjectById(projectId, {
        fields: ["id", "name", "shortName", "description", "iconUrl"],
      })) as Project
    } catch (error) {
      logger.error(`Error fetching project ${projectId} from YouTrack:`, error)
      return null
    }
  }

  /**
   * Gets multiple projects by their IDs
   * @param projectIds Array of project IDs to get
   * @returns Array of Project objects that were found
   */
  public async getProjectsByIds(projectIds: string[]): Promise<Project[]> {
    try {
      if (!projectIds.length) {
        return []
      }

      const allProjects = await this.getProjects()
      return allProjects.filter((project) => projectIds.includes(project.id))
    } catch (error) {
      logger.error("Error fetching projects by IDs from YouTrack:", error)
      return []
    }
  }
}
