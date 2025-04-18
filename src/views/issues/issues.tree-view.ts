import * as vscode from "vscode"
import * as logger from "../../utils/logger"

import type { YouTrackService, ViewService, CacheService } from "../../services"
import {
  VIEW_ISSUES,
  COMMAND_FILTER_ISSUES,
  COMMAND_REFRESH_ISSUES,
  COMMAND_TOGGLE_ISSUES_VIEW_MODE_LIST,
  COMMAND_TOGGLE_ISSUES_VIEW_MODE_TREE,
  ISSUE_VIEW_MODE_LIST,
  ISSUE_VIEW_MODE_TREE,
} from "./issues.consts"
import type { IssueBaseEntity, IssuesViewMode } from "./issues.types"
import { createBasicItem, createLoadingItem } from "../base/base.utils"
import { BaseTreeView, type YouTrackTreeItem } from "../base"
import { IssueTreeItem } from "./issues.tree-item"
import type { ProjectEntity } from "../projects"

export class IssuesTreeView extends BaseTreeView<IssueTreeItem | YouTrackTreeItem> {
  private _filter: string
  private _viewMode: IssuesViewMode

  get filter(): string {
    return this._filter
  }

  get viewMode(): IssuesViewMode {
    return this._viewMode
  }

  get activeProjectKey(): string | undefined {
    return this._viewService.activeProject?.shortName
  }

  constructor(
    _context: vscode.ExtensionContext,
    private _youtrackService: YouTrackService,
    private _viewService: ViewService,
    private _cacheService: CacheService,
  ) {
    super(VIEW_ISSUES, _context)
    this._filter = this._cacheService.getIssuesFilter() || ""
    this._viewMode = this._cacheService.getIssuesViewMode() || ISSUE_VIEW_MODE_LIST

    // Set initial view mode context
    void vscode.commands.executeCommand("setContext", "youtrack.viewMode", this._viewMode)

    this.subscriptions.push(
      vscode.window.registerFileDecorationProvider({ provideFileDecoration: this.fileDecorationProvider.bind(this) }),
    )
    this.subscriptions.push(this._viewService.onDidChangeActiveProject(this.onActiveProjectChanged.bind(this)))
    this.subscriptions.push(this._viewService.onDidRefreshViews(() => this.refresh()))

    this.registerCommand(COMMAND_FILTER_ISSUES, this.filterIssuesCommand.bind(this))
    this.registerCommand(COMMAND_REFRESH_ISSUES, this.refreshIssuesCommand.bind(this))
    this.registerCommand(COMMAND_TOGGLE_ISSUES_VIEW_MODE_TREE, this.setTreeViewMode.bind(this))
    this.registerCommand(COMMAND_TOGGLE_ISSUES_VIEW_MODE_LIST, this.setListViewMode.bind(this))
  }

  private onActiveProjectChanged(project: ProjectEntity | undefined): void {
    this.updateViewTitle(project)
    this.refresh()
  }

  // Update the view title to include the active project name
  private updateViewTitle = (project?: ProjectEntity) => {
    const projectPrefix = project ? `${project.shortName}: ` : ""
    this.treeView.title = `${projectPrefix}Issues`
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
        await this._cacheService.saveIssuesFilter(filterText)

        this.refresh()
      }
    } catch (error) {
      logger.error("Error filtering issues", error)
    }
  }

  /**
   * Toggle the view mode between list and tree
   */

  async setListViewMode(): Promise<void> {
    logger.info(`Setting issues view mode to: ${ISSUE_VIEW_MODE_LIST}`)
    this._viewMode = ISSUE_VIEW_MODE_LIST
    await this._cacheService.saveIssuesViewMode(ISSUE_VIEW_MODE_LIST)
    // Update VS Code context for menu visibility
    await vscode.commands.executeCommand("setContext", "youtrack.viewMode", ISSUE_VIEW_MODE_LIST)
    this.refresh()
  }

  async setTreeViewMode(): Promise<void> {
    logger.info(`Setting issues view mode to: ${ISSUE_VIEW_MODE_TREE}`)
    this._viewMode = ISSUE_VIEW_MODE_TREE
    await this._cacheService.saveIssuesViewMode(ISSUE_VIEW_MODE_TREE)
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
    if (!this.activeProjectKey) {
      return [
        createBasicItem(
          "No active project",
          "Select a project in the Projects panel",
          "Go to the Projects panel and select a project to view its issues",
        ),
      ]
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
    if (!this.activeProjectKey) {
      logger.info("No active project, skipping issue fetch")
      return []
    }

    logger.info(`Fetching issues for project: ${this.activeProjectKey}, filter: "${this.filter || "none"}"`)

    try {
      const issues =
        this._viewMode === ISSUE_VIEW_MODE_LIST
          ? await this._youtrackService.getIssues(this.activeProjectKey, this.filter)
          : await this._youtrackService.getChildIssues(this.activeProjectKey, parentId, this.filter)

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
