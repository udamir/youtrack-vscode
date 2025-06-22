import * as vscode from "vscode"
import * as logger from "../../utils/logger"

import type { YouTrackService, VSCodeService, CacheService } from "../../services"
import {
  VIEW_ISSUES,
  COMMAND_FILTER_ISSUES,
  COMMAND_REFRESH_ISSUES,
  COMMAND_TOGGLE_ISSUES_VIEW_MODE_LIST,
  COMMAND_TOGGLE_ISSUES_VIEW_MODE_TREE,
  ISSUE_VIEW_MODE_LIST,
  ISSUE_VIEW_MODE_TREE,
  COMMAND_FILTER_ISSUES_ACTIVE,
} from "./issues.consts"
import type { IssueBaseEntity, IssuesViewMode } from "./issues.types"
import { createBasicItem, createLoadingItem, BaseTreeView } from "../base"
import type { YouTrackTreeItem } from "../base"
import { IssueTreeItem } from "./issues.tree-item"
import type { IssuesSource } from "../searches"
import { getIssuesViewDescription, getIssuesViewTitle } from "./issues.utils"

export class IssuesTreeView extends BaseTreeView<IssueTreeItem | YouTrackTreeItem> {
  private _filter: string
  private _viewMode: IssuesViewMode
  private _issuesSource: IssuesSource | undefined

  get filter(): string {
    return this._filter
  }

  get viewMode(): IssuesViewMode {
    return this._viewMode
  }

  get activeProjectKey(): string | undefined {
    return this._vscodeService.issuesSource?.type === "project"
      ? this._vscodeService.issuesSource.source.shortName
      : undefined
  }

  constructor(
    _context: vscode.ExtensionContext,
    private _youtrackService: YouTrackService,
    private _vscodeService: VSCodeService,
  ) {
    super(VIEW_ISSUES, _context)
    this._filter = this.cache.getIssuesFilter() || ""
    this._viewMode = this.cache.getIssuesViewMode() || ISSUE_VIEW_MODE_LIST

    // Set initial view mode context
    void vscode.commands.executeCommand("setContext", "youtrack.viewMode", this._viewMode)

    // Initialize filter active state and tooltip
    void vscode.commands.executeCommand("setContext", "youtrack.filterActive", !!this._filter)

    this.subscriptions.push(
      vscode.window.registerFileDecorationProvider({ provideFileDecoration: this.fileDecorationProvider.bind(this) }),
    )
    this.subscriptions.push(this._vscodeService.onDidRefreshViews(() => this.refresh()))
    this.subscriptions.push(this._vscodeService.onDidChangeIssuesSource(this.onIssuesSourceChanged.bind(this)))

    this.registerCommand(COMMAND_FILTER_ISSUES, this.filterIssuesCommand.bind(this))
    this.registerCommand(COMMAND_REFRESH_ISSUES, this.refreshIssuesCommand.bind(this))
    this.registerCommand(COMMAND_TOGGLE_ISSUES_VIEW_MODE_TREE, this.setTreeViewMode.bind(this))
    this.registerCommand(COMMAND_TOGGLE_ISSUES_VIEW_MODE_LIST, this.setListViewMode.bind(this))
    this.registerCommand(COMMAND_FILTER_ISSUES_ACTIVE, this.filterIssuesCommand.bind(this))
  }

  /**
   * Handle active issues source changes
   * @param source The source change event with id and type
   */
  private onIssuesSourceChanged(source?: IssuesSource): void {
    logger.info(`Active issues source changed: ${source?.type}`)

    // Store the active issues source for use in getChildren
    this._issuesSource = source

    // Update view title based on source type
    this.treeView.title = getIssuesViewTitle(source)
    this.treeView.description = getIssuesViewDescription(source, this.filter)

    // Refresh the view with issues from the selected source
    this.refresh()
  }

  get cache(): CacheService {
    return this._vscodeService.cache
  }

  async filterIssuesCommand(): Promise<void> {
    try {
      const filterText = await vscode.window.showInputBox({
        title: "Filter Issues",
        prompt: "Enter issue filter text (YouTrack query syntax supported)",
        value: this._filter,
        placeHolder: "project: {project} #unresolved",
      })

      // Only update if the user didn't cancel and the value changed
      if (filterText !== undefined && filterText !== this._filter) {
        logger.info(`Setting issues filter to: ${filterText}`)

        this._filter = filterText
        await this.cache.saveIssuesFilter(filterText)

        // Set context variable to control filter icon appearance
        await vscode.commands.executeCommand("setContext", "youtrack.filterActive", !!filterText)
        this.treeView.description = getIssuesViewDescription(this._issuesSource, this.filter)

        this.refresh()
      }
    } catch (error) {
      logger.error(`Error filtering issues: ${error}`)
      vscode.window.showErrorMessage(`Error filtering issues: ${error}`)
    }
  }

  /**
   * Toggle the view mode between list and tree
   */

  async setListViewMode(): Promise<void> {
    logger.info(`Setting issues view mode to: ${ISSUE_VIEW_MODE_LIST}`)
    this._viewMode = ISSUE_VIEW_MODE_LIST
    await this.cache.saveIssuesViewMode(ISSUE_VIEW_MODE_LIST)
    // Update VS Code context for menu visibility
    await vscode.commands.executeCommand("setContext", "youtrack.viewMode", ISSUE_VIEW_MODE_LIST)
    this.refresh()
  }

  async setTreeViewMode(): Promise<void> {
    logger.info(`Setting issues view mode to: ${ISSUE_VIEW_MODE_TREE}`)
    this._viewMode = ISSUE_VIEW_MODE_TREE
    await this.cache.saveIssuesViewMode(ISSUE_VIEW_MODE_TREE)
    // Update VS Code context for menu visibility
    await vscode.commands.executeCommand("setContext", "youtrack.viewMode", ISSUE_VIEW_MODE_TREE)
    this.refresh()
  }

  /**
   * Refresh the view
   */
  async refreshIssuesCommand(): Promise<void> {
    this.refresh()
  }

  public async getChildren(
    element?: IssueTreeItem | YouTrackTreeItem | undefined,
  ): Promise<(IssueTreeItem | YouTrackTreeItem)[]> {
    // If no active source is selected, check if there's an active project
    if (!this._issuesSource) {
      return [createBasicItem("No active source", "Select a project, saved search, or sprint")]
    }

    if (this.isLoading) {
      return [createLoadingItem("Loading issues...")]
    }

    this.isLoading = true

    try {
      const issues = await this.getIssues(element?.id)

      return issues.length
        ? issues.map((issue) => new IssueTreeItem(issue, this.viewMode))
        : [this._createNoIssuesItem()]
    } catch (error) {
      logger.error("Error fetching issues:", error)
      return [createBasicItem("Error loading issues", "Check connection to YouTrack server")]
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Get issues for the current active project
   * @param parentId Optional parent issue ID for subtasks (used in tree view)
   */
  public async getIssues(parentId?: string): Promise<IssueBaseEntity[]> {
    if (!this._issuesSource) {
      logger.info("No active source, skipping issue fetch")
      return []
    }

    logger.info(`Fetching issues for source: ${this._issuesSource.type}, filter: "${this.filter || "none"}"`)

    try {
      let issues: IssueBaseEntity[] = []

      // Get issues based on the active source type
      switch (this._issuesSource.type) {
        case "project": {
          // If a project is selected in the Issue Searches panel
          issues =
            this._viewMode === ISSUE_VIEW_MODE_LIST
              ? await this._youtrackService.getProjectIssues(this._issuesSource.source.shortName, this.filter)
              : await this._youtrackService.getChildIssues(this._issuesSource.source.shortName, parentId, this.filter)
          break
        }
        case "search": {
          // If a saved search is selected
          issues = await this._youtrackService.getSavedSearchIssues(this._issuesSource.source.name, this.filter)
          break
        }
        case "sprint": {
          issues = await this._youtrackService.getSprintIssues(
            this._issuesSource.source.agile.name,
            this._issuesSource.source.name,
            this.filter,
          )
          break
        }
        case "favorites":
          issues = (await this._youtrackService.getFavorites(this.filter)) || []
          break
        case "assignedToMe":
          issues = (await this._youtrackService.getAssignedToMe(this.filter)) || []
          break
        case "commentedByMe":
          issues = (await this._youtrackService.getCommentedByMe(this.filter)) || []
          break
        case "reportedByMe":
          issues = (await this._youtrackService.getReportedByMe(this.filter)) || []
          break
      }

      logger.info(`Fetched ${issues.length} issues`)
      return issues
    } catch (error) {
      logger.error("Error fetching issues:", error)
      throw error
    }
  }

  private fileDecorationProvider(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === "youtrack" && uri.path === "resolved") {
      return {
        color: new vscode.ThemeColor("youtrackItem.resolvedForeground"),
        tooltip: "Resolved Issue",
      }
    }

    // Apply dark red color to bug issues
    if (uri.scheme === "youtrack" && uri.path === "bug") {
      return {
        color: new vscode.ThemeColor("youtrackItem.bugForeground"),
        tooltip: "Bug",
      }
    }

    return undefined
  }

  /**
   * Create a "No issues found" tree item
   */
  private _createNoIssuesItem(): YouTrackTreeItem {
    return createBasicItem("No issues found", this.filter ? `No results for "${this.filter}"` : "Project has no issues")
  }
}
