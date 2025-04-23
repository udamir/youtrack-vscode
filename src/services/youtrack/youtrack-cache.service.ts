import type * as vscode from "vscode"
import * as logger from "../../utils/logger"

import type { ArticleEntity, IssueEntity, IssuesViewMode, ProjectEntity } from "../../views"
import type { ServerCache } from "./youtrack.types"

/**
 * Cache service for YouTrack data
 * Manages storing and retrieving data in the extension's storage
 */
export class CacheService {
  private _baseUrl: string | undefined
  private readonly _workspaceState: vscode.Memento

  /**
   * Get the base URL currently used by this cache service
   */
  public get baseUrl(): string | undefined {
    return this._baseUrl
  }

  public setBaseUrl(value: string | undefined) {
    this._baseUrl = value
  }

  /**
   * Create a new cache service instance
   * @param workspaceState The workspace state to store data in
   */
  constructor(workspaceState: vscode.Memento) {
    this._workspaceState = workspaceState

    logger.info(`Cache service initialized with base URL: ${this.baseUrl || "none"}`)
  }

  /**
   * Get server-specific data from the workspace state
   * @param key The key to get data for
   * @returns The stored data or undefined if not found
   */
  private getValue<T extends keyof ServerCache>(key: T): ServerCache[T] | undefined {
    if (!this._baseUrl) {
      logger.warn(`Cannot get server value for \`${key}\` - no base URL available`)
      return undefined
    }

    const serverKey = `${this._baseUrl}/${key}`
    const value = this._workspaceState.get<ServerCache[T]>(serverKey)
    logger.info(`## Getting cache value for \`${serverKey}\` - value: \`${value}\``)
    return value
  }

  /**
   * Save server-specific data to the workspace state
   * @param key The key to store data for
   * @param value The value to store
   * @returns Promise that resolves when the data is stored
   */
  private async setValue<T extends keyof ServerCache>(key: T, value: ServerCache[T]): Promise<void> {
    if (!this._baseUrl) {
      logger.warn(`Cannot save server value for \`${key}\` - no base URL available`)
      return
    }

    const serverKey = `${this._baseUrl}/${key}`
    await this._workspaceState.update(serverKey, value)
    logger.info(`## Setting cache value for \`${serverKey}\` - value: \`${value}\``)
  }

  // Projects

  /**
   * Get the list of selected projects for the current server
   * @returns Array of selected projects
   */
  public getSelectedProjects(): ProjectEntity[] {
    return this.getValue("selectedProjects") || []
  }

  /**
   * Save the list of selected projects for the current server
   * @param projects Array of selected projects to save
   * @returns Promise that resolves when the projects are saved
   */
  public async saveSelectedProjects(projects: ProjectEntity[]): Promise<void> {
    await this.setValue("selectedProjects", projects)
  }

  /**
   * Get the active project for the current server
   * @returns The active project or undefined if none is set
   */
  public getActiveProjectKey(): string | undefined {
    return this.getValue("activeProjectKey")
  }

  /**
   * Save the active project for the current server
   * @param projectKey The project to save as active, or undefined to clear
   * @returns Promise that resolves when the active project is saved
   */
  public async saveActiveProject(projectKey: string | undefined): Promise<void> {
    await this.setValue("activeProjectKey", projectKey)
  }

  // Issues View Mode

  /**
   * Get the current view mode for issues
   * @returns The current view mode
   */
  public getIssuesViewMode(): IssuesViewMode | undefined {
    return this.getValue("issuesViewMode")
  }

  /**
   * Save the view mode for issues
   * @param mode The view mode to save
   * @returns Promise that resolves when the view mode is saved
   */
  public async saveIssuesViewMode(mode: IssuesViewMode): Promise<void> {
    await this.setValue("issuesViewMode", mode)
  }

  /**
   * Get the current filter for issues
   * @returns The current filter string
   */
  public getIssuesFilter(): string {
    return this.getValue("issuesFilter") || ""
  }

  /**
   * Save the filter for issues
   * @param filter The filter string to save
   * @returns Promise that resolves when the filter is saved
   */
  public async saveIssuesFilter(filter: string): Promise<void> {
    await this.setValue("issuesFilter", filter)
  }

  // Recent Issues

  /**
   * Get the list of recent issues for the current server
   * @returns Array of recent issues
   */
  public getRecentIssues(): IssueEntity[] {
    return this.getValue("recentIssues") || []
  }

  /**
   * Save the list of recent issues for the current server
   * @param issues Array of recent issues to save
   * @returns Promise that resolves when the issues are saved
   */
  public async saveRecentIssues(issues: IssueEntity[]): Promise<void> {
    // Limit to 10 most recent issues
    const limitedIssues = issues.slice(0, 10)
    await this.setValue("recentIssues", limitedIssues)
  }

  // Recent Articles

  /**
   * Get the list of recent articles for the current server
   * @returns Array of recent articles
   */
  public getRecentArticles(): ArticleEntity[] {
    return this.getValue("recentArticles") || []
  }

  /**
   * Save the list of recent articles for the current server
   * @param articles Array of recent articles to save
   * @returns Promise that resolves when the articles are saved
   */
  public async saveRecentArticles(articles: ArticleEntity[]): Promise<void> {
    // Limit to 10 most recent articles
    const limitedArticles = articles.slice(0, 10)
    await this.setValue("recentArticles", limitedArticles)
  }
}
