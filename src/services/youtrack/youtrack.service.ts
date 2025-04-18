import * as vscode from "vscode"
import type { YouTrack } from "youtrack-client"
import * as logger from "../../utils/logger"
import { AuthenticationService } from "./youtrack.auth"
import type { IssueEntity, ProjectEntity, ArticleEntity, IssueBaseEntity, ArticleBaseEntity } from "../../views"
import {
  AUTHENTICATED,
  AUTHENTICATION_FAILED,
  NOT_AUTHENTICATED,
  ISSUE_FIELDS,
  PROJECT_FIELDS,
  ARTICLE_FIELDS,
  ARTICLE_FIELDS_FULL,
  ISSUE_FIELDS_FULL,
} from "./youtrack.consts"
import { getIssueEntity, getArticleBaseEntity, getIssueBaseEntity, getArticleEntity } from "./youtrack.utils"
import type { AuthState } from "./youtrack.types"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService {
  private _client: YouTrack | null = null
  private _authService: AuthenticationService | null = null
  private previousBaseUrl: string | undefined
  private readonly _onServerChanged = new vscode.EventEmitter<string | undefined>()
  private readonly _onAuthStateChanged = new vscode.EventEmitter<AuthState>()

  public readonly onServerChanged = this._onServerChanged.event
  public readonly onAuthStateChanged = this._onAuthStateChanged.event

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
        this._client = this._authService.getClient()

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
   * Get the current YouTrack base URL
   * @returns The base URL or undefined if not connected
   */
  public get baseUrl(): string | undefined {
    return this._authService?.getBaseUrl()
  }

  /**
   * Handle authentication state changes
   * @param state New authentication state
   * @private
   */
  private handleAuthStateChange(state: AuthState): void {
    // Emit the auth state change event for subscribers
    this._onAuthStateChanged.fire(state)

    if (state === AUTHENTICATED && this._authService) {
      this._client = this._authService.getClient()

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
    } else if (state === NOT_AUTHENTICATED || state === AUTHENTICATION_FAILED) {
      this._client = null

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
        this._client = this._authService.getClient()

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
    this._client = null
  }

  /**
   * Get YouTrack client instance
   * @returns YouTrack client instance or null if not initialized
   */
  public get client(): YouTrack | null {
    return this._client
  }

  /**
   * Check if YouTrack is properly configured with valid credentials
   * @returns True if YouTrack is configured with valid credentials
   */
  public isConnected(): boolean {
    return this._client !== null && this._authService?.isAuthenticated() === true
  }

  /**
   * Gets all available projects from YouTrack
   * @returns Array of Project objects
   */
  public async getProjects(): Promise<ProjectEntity[]> {
    try {
      if (!this.client) {
        throw new Error("YouTrack client is not initialized")
      }

      // Fetch projects from the YouTrack client
      return (await this.client.Admin.Projects.getProjects({
        fields: PROJECT_FIELDS,
      })) as ProjectEntity[]
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
  public async getAvailableProjects(selectedProjectIds: string[]): Promise<ProjectEntity[]> {
    try {
      const allProjects = await this.getProjects()

      // Filter out already selected projects
      return allProjects.filter((project: ProjectEntity) => !selectedProjectIds.includes(project.id))
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
  public async getProjectById(projectId: string): Promise<ProjectEntity | null> {
    try {
      if (!this.client) {
        throw new Error("YouTrack client is not initialized")
      }

      // Get project details from YouTrack
      return (await this.client.Admin.Projects.getProjectById(projectId, {
        fields: PROJECT_FIELDS,
      })) as ProjectEntity
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
  public async getProjectsByIds(projectIds: string[]): Promise<ProjectEntity[]> {
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

  /**
   * Get issues for a specific project
   * @param projectShortName Short name of the project to fetch issues for
   * @param filter Optional filter string to apply (YouTrack query syntax)
   * @returns Array of issues or empty array if none found
   */
  public async getIssues(projectShortName: string, filter?: string): Promise<IssueBaseEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get issues")
        return []
      }

      // Construct the query to filter by project
      let query = `project: {${projectShortName}}`

      // Add any additional filter criteria if provided
      if (filter && filter.trim().length > 0) {
        query += ` ${filter}`
      }

      logger.info(`Fetching issues with query: ${query}`)

      const issues = await this.client.Issues.getIssues({ query, fields: ISSUE_FIELDS, $top: 50 })

      // Map to our simplified Issue model
      return issues.map(getIssueBaseEntity)
    } catch (error) {
      logger.error("Error fetching issues:", error)
      return []
    }
  }

  /**
   * Get child issues for a specific project
   * @param projectShortName Short name of the project to fetch child issues for
   * @param parentIssueId Optional ID of the parent issue to filter by
   * @param filter Optional additional filter criteria
   * @returns Array of child issues or empty array if none found
   */
  public async getChildIssues(
    projectShortName: string,
    parentIssueId?: string,
    filter?: string,
  ): Promise<IssueBaseEntity[]> {
    const parentFilter = parentIssueId ? `subtask of: {${parentIssueId}}` : "has: -{Subtask of}"
    return this.getIssues(projectShortName, `${parentFilter}${filter ? ` ${filter}` : ""}`)
  }

  /**
   * Get a specific issue by ID
   * @param issueId ID of the issue to fetch
   * @returns Issue object or null if not found
   */
  public async getIssueById(issueId: string): Promise<IssueEntity | null> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get issue")
        return null
      }

      logger.info(`Fetching issue with ID: ${issueId}`)

      // Fetch issue details
      const issue = await this.client.Issues.getIssueById(issueId, { fields: ISSUE_FIELDS_FULL })

      if (!issue) {
        return null
      }

      // Map to our simplified Issue model
      return getIssueEntity(issue)
    } catch (error) {
      logger.error(`Error fetching issue ${issueId}:`, error)
      return null
    }
  }

  /**
   * Get a specific article by ID
   * @param articleId ID of the article to fetch
   * @returns Article object or null if not found
   */
  public async getArticleById(articleId: string): Promise<ArticleEntity | null> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get article")
        return null
      }

      logger.info(`Fetching article with ID: ${articleId}`)

      // Fetch article details
      const article = await this.client.Articles.getArticle(articleId, { fields: ARTICLE_FIELDS_FULL })

      // Map to our simplified Article model
      return getArticleEntity(article)
    } catch (error) {
      logger.error(`Error fetching article ${articleId}:`, error)
      return null
    }
  }

  /**
   * Get knowledge base articles for a project
   * @param projectId Project ID to fetch articles for
   * @returns Array of articles or empty array if not found/error
   */
  public async getArticles(projectId: string): Promise<ArticleBaseEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get articles")
        return []
      }

      logger.info(`Fetching articles for project ID: ${projectId}`)

      // Fetch articles for the project using more specific typing and any type to bypass strict typing
      const articles = await this.client.Admin.Projects.getProjectArticles(projectId, {
        $skip: 0,
        $top: 100,
        fields: [...ARTICLE_FIELDS],
      })

      if (!articles || !articles.length) {
        logger.info(`No articles found for project ${projectId}`)
        return []
      }

      // Filter to only top-level articles (no parent)
      const topLevelArticles = articles.filter((a: any) => {
        // Use type assertion to avoid TypeScript errors
        return !a.$type || (a.$type === "Article" && !a.parentArticle)
      })

      // Map to our simplified Article model
      return topLevelArticles.map((article) => getArticleBaseEntity(article))
    } catch (error) {
      logger.error(`Error fetching articles for project ${projectId}:`, error)
      return []
    }
  }

  /**
   * Get child articles for a parent article
   * @param parentArticleId Parent article ID to fetch children for
   * @returns Array of child articles or empty array if not found/error
   */
  public async getChildArticles(parentArticleId: string): Promise<ArticleBaseEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get child articles")
        return []
      }

      logger.info(`Fetching child articles for parent article ID: ${parentArticleId}`)

      // Fetch parent article with children
      const articles = await this.client.Articles.getChildArticles(parentArticleId, {
        fields: ARTICLE_FIELDS,
      })

      if (!articles || !articles.length) {
        logger.info(`No child articles found for article ${parentArticleId}`)
        return []
      }

      // Map children to our simplified Article model
      return articles.map((article) => getArticleBaseEntity(article))
    } catch (error) {
      logger.error(`Error fetching child articles for article ${parentArticleId}:`, error)
      return []
    }
  }
}
