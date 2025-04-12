import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import { createLoadingItem } from "./tree-view-utils"
import * as logger from "../utils/logger"
import type { IssueEntity, ProjectEntity } from "../models"
import type { YouTrackService } from "../services/youtrack-client"
import type { ProjectsTreeDataProvider, ProjectChangeEvent } from "./projects-tree-view"
import type { CacheService } from "../services/cache-service"
import { COMMAND_OPEN_ISSUE, ISSUE_VIEW_MODE_LIST, ISSUE_VIEW_MODE_TREE } from "../consts/vscode"
import type { IssuesViewMode } from "../models/cache"

/**
 * Tree item representing a YouTrack issue
 */
export class IssueTreeItem extends YouTrackTreeItem {
  constructor(public readonly issue: IssueEntity) {
    super(
      issue.summary,
      // Set collapsible state based on whether the issue has children
      issue.hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
      {
        command: COMMAND_OPEN_ISSUE,
        title: "Open Issue",
        arguments: [{ issue }],
      },
      issue.resolved ? "youtrack-issue-resolved" : "youtrack-issue",
    )

    // Set the id property to match the issue id for tracking
    this.id = issue.id

    // Set description to show the issue ID
    this.description = issue.idReadable

    // Set tooltip to include additional info
    const status = issue.resolved ? "Resolved" : "Open"
    this.tooltip = `${issue.idReadable}: ${issue.summary}\nStatus: ${status}`

    // Set icon based on resolved state
    if (issue.resolved) {
      this.iconPath = new vscode.ThemeIcon("check")
    } else {
      this.iconPath = new vscode.ThemeIcon("issues")
    }
  }
}

/**
 * Tree data provider for YouTrack Issues view
 */
export class IssuesTreeDataProvider extends BaseTreeDataProvider {
  private _filter = ""
  private _viewMode: IssuesViewMode = ISSUE_VIEW_MODE_LIST
  private _activeProject?: ProjectEntity
  private _issues: IssueEntity[] = []
  private _projectChangeDisposable: vscode.Disposable | undefined

  constructor(
    youtrackService: YouTrackService,
    private readonly _cacheService: CacheService,
    private readonly _projectsProvider: ProjectsTreeDataProvider,
  ) {
    super(youtrackService)

    // Register for project change events
    this._projectChangeDisposable = this._projectsProvider.onDidChangeActiveProject(this._onProjectChanged.bind(this))

    // Get the initial active project
    this._activeProject = this._projectsProvider.activeProject
    // Load view mode from cache
    this._loadViewModeFromCache()
  }

  /**
   * Get or set the current view mode
   */
  public get viewMode(): IssuesViewMode {
    return this._viewMode
  }

  public set viewMode(value: IssuesViewMode) {
    if (this._viewMode !== value) {
      this._viewMode = value
      // Save the view mode to cache
      this._cacheService.saveIssuesViewMode(value)
      this.refresh()
    }
  }

  /**
   * Get the current filter text
   */
  public get filter(): string {
    return this._filter
  }

  /**
   * Set the filter text
   */
  public set filter(filter: string) {
    if (this._filter !== filter) {
      this._filter = filter
      this.refresh()
    }
  }

  /**
   * Toggle between list and tree view modes
   */
  public toggleViewMode(): void {
    this.viewMode = this._viewMode === ISSUE_VIEW_MODE_LIST ? ISSUE_VIEW_MODE_TREE : ISSUE_VIEW_MODE_LIST
  }

  /**
   * Get the currently active project short name
   */
  public get activeProjectKey(): string | undefined {
    return this._activeProject?.shortName
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this._projectChangeDisposable) {
      this._projectChangeDisposable.dispose()
      this._projectChangeDisposable = undefined
    }
  }

  /**
   * Get children for the Issues view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    if (!this.activeProjectKey) {
      const noProject = new YouTrackTreeItem("No project selected", vscode.TreeItemCollapsibleState.None)
      noProject.description = "Select a project in the Projects panel"
      noProject.tooltip = "Go to the Projects panel and select a project to view its issues"
      return [noProject]
    }

    if (this.isLoading) {
      return [createLoadingItem("Loading issues...")]
    }

    this.isLoading = true

    try {
      // This is the root level - load issues if not already loaded
      if (!element && this.viewMode === ISSUE_VIEW_MODE_LIST) {
        // In list mode, return all issues as flat list
        // Fetch the issues for the active project
        this._issues = await this.youtrackService.getIssues(this.activeProjectKey, this._filter)
        return this._issues.length
          ? this._issues.map((issue) => new IssueTreeItem(issue))
          : [this._createNoIssuesItem()]
      }

      // In tree mode return issues with no parent
      this._issues = await this.youtrackService.getChildIssues(this.activeProjectKey, element?.id, this._filter)

      return this._issues.length ? this._issues.map((issue) => new IssueTreeItem(issue)) : [this._createNoIssuesItem()]
    } catch (error) {
      logger.error("Error fetching issues:", error)
      const errorItem = new YouTrackTreeItem("Error loading issues", vscode.TreeItemCollapsibleState.None)
      errorItem.tooltip = "Check connection to YouTrack server"
      return [errorItem]
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Create a "No issues found" tree item
   */
  private _createNoIssuesItem(): YouTrackTreeItem {
    const noIssues = new YouTrackTreeItem("No issues found", vscode.TreeItemCollapsibleState.None)

    if (this._filter) {
      noIssues.description = `No results for "${this._filter}"`
      noIssues.tooltip = "Try a different filter"
    } else {
      noIssues.description = "Project has no issues"
    }

    return noIssues
  }

  /**
   * Handle project change events
   */
  private _onProjectChanged(e: ProjectChangeEvent): void {
    this._activeProject = e.project
    this.refresh()
  }

  /**
   * Load view mode preference from cache
   */
  private _loadViewModeFromCache(): void {
    const cachedViewMode = this._cacheService.getIssuesViewMode()
    if (cachedViewMode) {
      this._viewMode = cachedViewMode
    }
  }
}
