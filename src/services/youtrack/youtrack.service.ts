import { YouTrack } from "youtrack-client"
import * as logger from "../../utils/logger"
import type { IssueEntity, ProjectEntity, ArticleEntity, IssueBaseEntity, ArticleBaseEntity } from "../../views"
import type { SavedSearchEntity, AgileBoardEntity } from "../../views/searches"
import {
  ISSUE_FIELDS,
  PROJECT_FIELDS,
  ARTICLE_FIELDS,
  ARTICLE_FIELDS_FULL,
  ISSUE_FIELDS_FULL,
  USER_PROFILE_FIELDS,
  AGILE_BOARD_FIELDS,
  SAVED_SEARCH_FIELDS_BASE,
} from "./youtrack.consts"
import {
  getIssueEntity,
  getArticleBaseEntity,
  getIssueBaseEntity,
  getArticleEntity,
  getSavedSearchEntity,
  getAgileBoardEntity,
} from "./youtrack.utils"

import { Disposable } from "../../utils/disposable"
import { tryCatch } from "../../utils/tryCatch"

/**
 * Service for interacting with YouTrack API
 */
export class YouTrackService extends Disposable {
  private _client: YouTrack | null = null

  /**
   * Initialize the YouTrack client with credentials
   * @returns True if initialization was successful
   */
  public async authenticate(baseUrl: string, token: string): Promise<boolean> {
    if (!baseUrl || !token) {
      return false
    }

    // Initialize the client
    const testClient = YouTrack.client(baseUrl, token)

    // Test the connection by fetching current user
    const [user, error] = await tryCatch(testClient.Users.getCurrentUserProfile({ fields: USER_PROFILE_FIELDS }))

    if (user) {
      // If no error was thrown, credentials are valid
      this._client = testClient
      return true
    }

    logger.error("Credentials verification failed:", error)
    this._client = null
    return false
  }

  /**
   * Get the current YouTrack base URL
   * @returns The base URL or undefined if not connected
   */
  public get baseUrl(): string | undefined {
    return this._client?.baseUrl
  }

  /**
   * Get saved queries for the current user
   * @returns Array of saved queries or empty array if none found/error
   */
  public async getSavedQueries(): Promise<SavedSearchEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get saved searches")
        return []
      }

      // Get saved searches from YouTrack
      const searches = await this.client.SavedQueries.getSavedQueries({
        fields: SAVED_SEARCH_FIELDS_BASE,
        $top: -1,
      })

      // Map to our simplified SavedSearch model
      return searches.map(getSavedSearchEntity)
    } catch (error) {
      logger.error("Error fetching saved searches:", error)
      return []
    }
  }

  public async getSavedSearchIssues(name: string, filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`saved search: ${name} ${filter ? ` ${filter}` : ""}`)
  }

  /**
   * Get all available agile boards
   * @returns Array of agile boards or empty array if none found/error
   */
  public async getAgileBoards(): Promise<AgileBoardEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get agile boards")
        return []
      }

      // Get agile boards from YouTrack
      const boards = await this.client.Agiles.getAgiles({ fields: AGILE_BOARD_FIELDS, $top: -1 })

      // Map to our simplified AgileBoard model
      return boards.map(getAgileBoardEntity)
    } catch (error) {
      logger.error("Error fetching agile boards:", error)
      return []
    }
  }

  /**
   * Get issues for an agile board
   * @param agileBoardName Name of the agile board
   * @param sprintName Name of the sprint
   * @returns Array of issues or empty array if none found
   */
  public async getSprintIssues(
    agileBoardName: string,
    sprintName: string,
    filter?: string,
  ): Promise<IssueBaseEntity[]> {
    return this.getIssues(`Board ${agileBoardName}: ${sprintName}${filter ? ` ${filter}` : ""}`)
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
    return this._client !== null
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

  public async getIssues(filter?: string): Promise<IssueBaseEntity[]> {
    try {
      if (!this.isConnected() || !this.client) {
        logger.warn("YouTrack service not connected, cannot get issues")
        return []
      }

      const query = filter && filter.trim().length > 0 ? filter : ""

      logger.info(`Fetching issues with query: ${query}`)

      const issues = await this.client.Issues.getIssues({ query, fields: ISSUE_FIELDS, $top: 250 })

      // Map to our simplified Issue model
      return issues.map(getIssueBaseEntity)
    } catch (error) {
      logger.error("Error fetching issues:", error)
      return []
    }
  }

  public async getFavorites(filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`tag: Star ${filter ? ` ${filter}` : ""}`)
  }

  public async getAssignedToMe(filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`assigned to: me ${filter ? ` ${filter}` : ""}`)
  }

  public async getCommentedByMe(filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`commented by: me ${filter ? ` ${filter}` : ""}`)
  }

  public async getReportedByMe(filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`reported by: me ${filter ? ` ${filter}` : ""}`)
  }

  /**
   * Get issues for a specific project
   * @param projectShortName Short name of the project to fetch issues for
   * @param filter Optional filter string to apply (YouTrack query syntax)
   * @returns Array of issues or empty array if none found
   */
  public async getProjectIssues(projectShortName: string, filter?: string): Promise<IssueBaseEntity[]> {
    return this.getIssues(`project: {${projectShortName}} ${filter ? ` ${filter}` : ""}`)
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
    return this.getProjectIssues(projectShortName, `${parentFilter}${filter ? ` ${filter}` : ""}`)
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
        $top: -1,
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

  /**
   * Update issue description
   * @param issueId Issue ID
   * @param description New description
   * @param summary Optional summary to update
   */
  public async updateIssueDescription(issueId: string, description: string, summary?: string): Promise<IssueEntity> {
    try {
      logger.info(`Updating issue ${issueId}`)

      // Validate connection
      if (!this.isConnected() || !this.client) {
        throw new Error("Not connected to YouTrack")
      }

      // Prepare update data
      const updateData: any = {
        description,
      }

      // Add summary if provided
      if (summary) {
        updateData.summary = summary
      }

      // Update the issue
      const issue = await this.client.Issues.updateIssue(issueId, updateData, { fields: ISSUE_FIELDS_FULL })

      logger.info(`Successfully updated issue ${issueId}`)
      return getIssueEntity(issue)
    } catch (error) {
      logger.error(`Error updating issue: ${error}`)
      throw error
    }
  }

  /**
   * Update article content
   * @param articleId Article ID
   * @param content New content
   * @param summary Optional summary to update
   */
  public async updateArticleContent(articleId: string, content: string, summary?: string): Promise<ArticleEntity> {
    try {
      logger.info(`Updating article ${articleId}`)

      // Validate connection
      if (!this.isConnected() || !this.client) {
        throw new Error("Not connected to YouTrack")
      }

      // Prepare update data
      const updateData: any = {
        content,
      }

      // Add summary if provided
      if (summary) {
        updateData.summary = summary
      }

      // Update the article
      const article = await this.client.Articles.updateArticle(articleId, updateData, { fields: ARTICLE_FIELDS_FULL })

      logger.info(`Successfully updated article ${articleId}`)
      return getArticleEntity(article)
    } catch (error) {
      logger.error(`Error updating article: ${error}`)
      throw error
    }
  }
}
