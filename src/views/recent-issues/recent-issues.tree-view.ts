import * as vscode from "vscode"
import { BaseTreeView, YouTrackTreeItem, createLoadingItem } from "../base"
import type { WorkspaceService, VSCodeService, YouTrackService } from "../../services"
import { RecentIssueItem } from "./recent-issues.tree-item"
import type { IssueEntity } from "../issues"
import { VIEW_RECENT_ISSUES } from "./recent-issues.consts"

/**
 * Tree data provider for YouTrack recent issues
 */
export class RecentIssuesTreeView extends BaseTreeView<RecentIssueItem | YouTrackTreeItem> {
  private _issues: IssueEntity[] = []
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Create a new recent issues tree data provider
   * @param youtrackService The YouTrack service to use for storing/retrieving issues
   * @param vscodeService The VSCode service to use for handle server change events
   */
  constructor(
    _context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_RECENT_ISSUES, _context)

    // Register for cache change events
    this._serverChangeDisposable = this._vscodeService.onServerChanged(this.loadFromCache.bind(this))

    // Load initial data from cache
    this.loadFromCache()
  }

  get cache(): WorkspaceService {
    return this._youtrackService.cache
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
  public async getChildren(): Promise<YouTrackTreeItem[]> {
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
          arguments: [vscode.Uri.parse(`${this.cache.baseUrl}/issue/${issue.idReadable}`)],
        }),
    )
  }

  /**
   * Load recent issues from cache
   */
  private loadFromCache(): void {
    this.isLoading = true
    this._issues = this.cache.getRecentIssues()
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
    this.cache.saveRecentIssues(this._issues)

    // Refresh the view
    this.refresh()
  }
}
