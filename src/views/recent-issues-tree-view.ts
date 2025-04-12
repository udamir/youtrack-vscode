import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import type { CacheService } from "../services/cache-service"
import type { YouTrackService } from "../services/youtrack-client"
import type { IssueEntity } from "../models"
import { createLoadingItem } from "./tree-view-utils"

/**
 * Tree item representing a YouTrack issue
 */
export class RecentIssueItem extends YouTrackTreeItem {
  constructor(
    public readonly issue: IssueEntity,
    public readonly command?: vscode.Command,
  ) {
    super(issue.idReadable || `#${issue.id}`, vscode.TreeItemCollapsibleState.None, command, "youtrack-issue")

    // Set description to show the issue summary
    this.description = issue.summary

    // Set tooltip to include summary
    this.tooltip = `${issue.idReadable}: ${issue.summary}`
  }
}

/**
 * Tree data provider for YouTrack recent issues
 */
export class RecentIssuesTreeDataProvider extends BaseTreeDataProvider {
  private _issues: IssueEntity[] = []
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Create a new recent issues tree data provider
   * @param youtrackService The YouTrack service
   * @param cacheService The cache service to use for storing/retrieving issues
   */
  constructor(
    youtrackService: YouTrackService,
    private readonly _cacheService: CacheService,
  ) {
    super(youtrackService)

    // Register for cache change events
    this._serverChangeDisposable = this.youtrackService.onServerChanged(this.loadFromCache.bind(this))

    // Load initial data from cache
    this.loadFromCache()
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this._serverChangeDisposable) {
      this._serverChangeDisposable.dispose()
    }
  }

  /**
   * Get children for the recent issues view
   * @returns Tree items representing recent issues
   */
  protected async getConfiguredChildren(): Promise<YouTrackTreeItem[]> {
    if (this.isLoading) {
      return [createLoadingItem("Loading recent issues...")]
    }

    if (this._issues.length === 0) {
      return [YouTrackTreeItem.withThemeIcon("No recent issues", vscode.TreeItemCollapsibleState.None, "info")]
    }

    return this._issues.map(
      (issue) =>
        new RecentIssueItem(issue, {
          command: "vscode.open",
          title: "Open Issue",
          arguments: [vscode.Uri.parse(`${this._cacheService.baseUrl}/issue/${issue.idReadable}`)],
        }),
    )
  }

  /**
   * Load recent issues from cache
   */
  private loadFromCache(): void {
    this.isLoading = true
    this._issues = this._cacheService.getRecentIssues()
    this.isLoading = false
  }

  /**
   * Add an issue to the recent issues list
   * @param issue The issue to add
   */
  public addIssue(issue: IssueEntity): void {
    // Check if issue already exists in the list
    const existingIndex = this._issues.findIndex((i) => i.id === issue.id)

    // If it exists, remove it so we can add it to the front
    if (existingIndex >= 0) {
      this._issues.splice(existingIndex, 1)
    }

    // Add to the front of the list
    this._issues = [issue, ...this._issues]

    // Save to cache
    this._cacheService.saveRecentIssues(this._issues)

    // Refresh the view
    this.refresh()
  }
}
