import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { BaseTreeView } from "../base"
import { YouTrackTreeItem } from "../base"

import {
  VIEW_ISSUE_SEARCHES,
  COMMAND_ADD_SEARCH_ITEM,
  COMMAND_REMOVE_SEARCH_ITEM,
  SEARCH_ROOT_PROJECTS,
  SEARCH_ROOT_SEARCHES,
  SEARCH_ROOT_BOARDS,
  COMMAND_SET_ISSUES_SOURCE,
  SEARCH_ROOT_STANDARD,
  SEARCH_ASSIGNED_TO_ME,
  SEARCH_FAVORITES,
  SEARCH_REPORTED_BY_ME,
  SEARCH_COMMENTED_BY_ME,
} from "./searches.consts"

import {
  SearchRootTreeItem,
  SearchProjectTreeItem,
  SearchSavedSearchTreeItem,
  SearchAgileTreeItem,
  SearchSprintTreeItem,
  SearchStandardTreeItem,
} from "./searches.tree-item"
import type { YouTrackService, VSCodeService, CacheService } from "../../services"
import type { AgileBoardEntity, IssuesSource, SavedSearchEntity, SearchRootCategory } from "./searches.types"
import type { ProjectEntity } from "../projects"

/**
 * Tree data provider for YouTrack Issue Searches view (Projects, Saved Searches, Agile Boards)
 */
export class IssueSearchesTreeView extends BaseTreeView<
  | SearchRootTreeItem
  | SearchProjectTreeItem
  | SearchSavedSearchTreeItem
  | SearchAgileTreeItem
  | SearchSprintTreeItem
  | YouTrackTreeItem
> {
  // Cached data
  private _projects: ProjectEntity[] = []
  private _savedSearches: SavedSearchEntity[] = []
  private _agileBoards: AgileBoardEntity[] = []

  get issuesSource(): IssuesSource | undefined {
    return this._vscodeService.issuesSource
  }

  /**
   * Factory method to register the view
   */
  static register(
    context: vscode.ExtensionContext,
    youtrackService: YouTrackService,
    vscodeService: VSCodeService,
  ): IssueSearchesTreeView {
    return new IssueSearchesTreeView(context, youtrackService, vscodeService)
  }

  /**
   * Initialize Issue Searches Tree View
   */
  constructor(
    context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_ISSUE_SEARCHES, context)

    // Listen for server changes
    this.subscriptions.push(this._vscodeService.onServerChanged(() => this.loadFromCache()))

    // Register commands
    this.registerCommand(COMMAND_ADD_SEARCH_ITEM, this.addSearchItemCommand.bind(this))
    this.registerCommand(COMMAND_REMOVE_SEARCH_ITEM, this.removeSearchItemCommand.bind(this))
    this.registerCommand(COMMAND_SET_ISSUES_SOURCE, this.setIssuesSourceCommand.bind(this))

    // Load state from cache
    this.loadFromCache()
  }

  /**
   * Accessor for cache service
   */
  public get cache(): CacheService {
    return this._vscodeService.cache
  }

  /**
   * Load selected items from cache
   */
  private async loadFromCache(): Promise<void> {
    // Load projects, saved searches, and boards from cache
    this._projects = this.cache.getSelectedProjects()
    this._savedSearches = this.cache.getSavedSearches()
    this._agileBoards = this.cache.getAgileBoards()

    this.refresh()
  }

  /**
   * Get tree item for given element
   */
  public getTreeItem(
    element:
      | SearchRootTreeItem
      | SearchProjectTreeItem
      | SearchSavedSearchTreeItem
      | SearchAgileTreeItem
      | SearchSprintTreeItem
      | YouTrackTreeItem,
  ): vscode.TreeItem {
    if (
      element instanceof SearchProjectTreeItem &&
      this.issuesSource?.type === "project" &&
      element.project.id === this.issuesSource.source.id
    ) {
      // Add special styling for active source
      element.description = "Active"
    }

    return element
  }

  /**
   * Get children for the tree view
   */
  public async getChildren(
    element?: SearchRootTreeItem | SearchAgileTreeItem,
  ): Promise<
    (
      | SearchRootTreeItem
      | SearchProjectTreeItem
      | SearchSavedSearchTreeItem
      | SearchAgileTreeItem
      | SearchSprintTreeItem
      | YouTrackTreeItem
    )[]
  > {
    // Root level - display the three categories
    if (!element) {
      return [
        new SearchRootTreeItem(
          SEARCH_ROOT_PROJECTS,
          "Projects",
          this._projects.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
        ),
        new SearchRootTreeItem(
          SEARCH_ROOT_SEARCHES,
          "Saved Searches",
          this._savedSearches.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None,
        ),
        new SearchRootTreeItem(
          SEARCH_ROOT_BOARDS,
          "Agile Boards",
          this._agileBoards.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None,
        ),
        new SearchRootTreeItem(SEARCH_ROOT_STANDARD, "Default searches", vscode.TreeItemCollapsibleState.Collapsed),
      ]
    }

    // Handle each root category
    if (element instanceof SearchRootTreeItem) {
      switch (element.categoryId) {
        case SEARCH_ROOT_PROJECTS:
          return this.getProjectItems()
        case SEARCH_ROOT_SEARCHES:
          return this.getSavedSearchItems()
        case SEARCH_ROOT_BOARDS:
          return this.getAgileBoardItems()
        case SEARCH_ROOT_STANDARD:
          return [
            new SearchStandardTreeItem(SEARCH_FAVORITES, "Favorites", this.issuesSource?.type === "favorites"),
            new SearchStandardTreeItem(
              SEARCH_ASSIGNED_TO_ME,
              "Assigned to me",
              this.issuesSource?.type === "assignedToMe",
            ),
            new SearchStandardTreeItem(
              SEARCH_REPORTED_BY_ME,
              "Reported by me",
              this.issuesSource?.type === "reportedByMe",
            ),
            new SearchStandardTreeItem(
              SEARCH_COMMENTED_BY_ME,
              "Commented by me",
              this.issuesSource?.type === "commentedByMe",
            ),
          ]
      }
    }

    // Handle Agile Board item - display its non-archived sprints
    if (
      element instanceof SearchAgileTreeItem &&
      element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed
    ) {
      return this.getSprintItems(element.board)
    }

    return []
  }

  /**
   * Create a text item specifically for SearchSourceTreeItem type
   */

  private createSearchTextItem(label: string, description?: string, tooltip?: string): YouTrackTreeItem {
    const item = new YouTrackTreeItem(label, vscode.TreeItemCollapsibleState.None)
    item.tooltip = tooltip
    item.description = description
    return item
  }

  /**
   * Get project items
   */
  private async getProjectItems(): Promise<SearchProjectTreeItem[]> {
    const { type, source } = this.issuesSource || {}
    return this._projects.map(
      (project) => new SearchProjectTreeItem(project, type === "project" && source?.id === project.id),
    )
  }

  /**
   * Get saved search items
   */
  private async getSavedSearchItems(): Promise<SearchSavedSearchTreeItem[]> {
    const { type, source } = this.issuesSource || {}
    return this._savedSearches.map(
      (search) => new SearchSavedSearchTreeItem(search, type === "search" && source?.id === search.id),
    )
  }

  /**
   * Get agile board items
   */
  private async getAgileBoardItems(): Promise<SearchAgileTreeItem[]> {
    return this._agileBoards.map((board) => new SearchAgileTreeItem(board, vscode.TreeItemCollapsibleState.Collapsed))
  }

  /**
   * Get sprint items for an agile board
   */
  private async getSprintItems(board: AgileBoardEntity): Promise<[YouTrackTreeItem] | SearchSprintTreeItem[]> {
    if (!board.sprints) {
      return [this.createSearchTextItem("No sprints available")]
    }

    // Filter out archived sprints
    const activeSprintItems = board.sprints.filter((sprint) => !sprint.archived)

    if (activeSprintItems.length === 0) {
      return [this.createSearchTextItem("No active sprints available")]
    }

    const { type, source } = this.issuesSource || {}

    // Create sprint items
    return activeSprintItems.map(
      (sprint) => new SearchSprintTreeItem(sprint, type === "sprint" && source?.id === sprint.id),
    )
  }

  /**
   * Add new search item (project, saved search, or agile board)
   */
  private async addSearchItemCommand(rootItem?: SearchRootTreeItem): Promise<void> {
    if (!rootItem) {
      // If no root item was provided (command called from toolbar), ask which type to add
      const itemType = await vscode.window.showQuickPick(
        [
          { label: "Project", value: SEARCH_ROOT_PROJECTS },
          { label: "Saved Search", value: SEARCH_ROOT_SEARCHES },
          { label: "Agile Board", value: SEARCH_ROOT_BOARDS },
        ],
        { placeHolder: "Select item type to add" },
      )

      if (!itemType) {
        return
      }

      rootItem = new SearchRootTreeItem(itemType.value as SearchRootCategory, itemType.label)
    }

    // Handle based on category
    switch (rootItem.categoryId) {
      case SEARCH_ROOT_PROJECTS:
        await this.addProjectCommand()
        break
      case SEARCH_ROOT_SEARCHES:
        await this.addSavedSearchCommand()
        break
      case SEARCH_ROOT_BOARDS:
        await this.addAgileBoardCommand()
        break
    }
  }

  /**
   * Add project from available projects
   */
  private async addProjectCommand(): Promise<void> {
    try {
      this.isLoading = true

      // Get all projects
      const allProjects = await this._youtrackService.getProjects()

      // Filter out already selected projects
      const availableProjects = allProjects.filter((p) => !this._projects.some((selected) => selected.id === p.id))

      if (availableProjects.length === 0) {
        vscode.window.showInformationMessage("All projects have already been added")
        return
      }

      // Show project selection
      const selected = await vscode.window.showQuickPick(
        availableProjects.map((p) => ({
          label: p.name,
          description: p.shortName,
          detail: p.description || undefined,
          project: p,
        })),
        { placeHolder: "Select project to add" },
      )

      if (selected) {
        // Add the project
        this._projects = [...this._projects, selected.project]
        await this.cache.saveSelectedProjects(this._projects)
        this.refresh()

        // Set as active if no source is active
        if (!this.issuesSource) {
          await this.setIssuesSourceCommand({ source: selected.project, type: "project" })
        }
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Add saved search from available saved searches
   */
  private async addSavedSearchCommand(): Promise<void> {
    try {
      this.isLoading = true

      // Get saved searches
      const allSearches = await this._youtrackService.getSavedQueries()

      // Filter out already added searches
      const availableSearches = allSearches.filter((s) => !this._savedSearches.some((selected) => selected.id === s.id))

      if (availableSearches.length === 0) {
        vscode.window.showInformationMessage("All saved searches have already been added")
        return
      }

      // Show search selection
      const selected = await vscode.window.showQuickPick(
        availableSearches.map((s) => ({
          label: s.name,
          description: s.query,
          search: s,
        })),
        { placeHolder: "Select saved search to add" },
      )

      if (selected) {
        // Add the saved search
        this._savedSearches = [...this._savedSearches, selected.search]
        await this.cache.saveSavedSearches(this._savedSearches)
        this.refresh()

        // Set as active if no source is active
        if (!this.issuesSource) {
          await this.setIssuesSourceCommand({ source: selected.search, type: "search" })
        }
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Add agile board from available boards
   */
  private async addAgileBoardCommand(): Promise<void> {
    try {
      this.isLoading = true

      // Get agile boards
      const allBoards = await this._youtrackService.getAgileBoards()

      // Filter out already added boards
      const availableBoards = allBoards.filter((b) => !this._agileBoards.some((selected) => selected.id === b.id))

      if (availableBoards.length === 0) {
        vscode.window.showInformationMessage("All agile boards have already been added")
        return
      }

      // Show board selection
      const selected = await vscode.window.showQuickPick(
        availableBoards.map((b) => ({
          label: b.name,
          description: `${b.sprints?.length || 0} sprints`,
          board: b,
        })),
        { placeHolder: "Select agile board to add" },
      )

      if (selected) {
        // Add the agile board
        this._agileBoards = [...this._agileBoards, selected.board]
        await this.cache.saveAgileBoards(this._agileBoards)
        this.refresh()

        // Set as active if no source is active
        if (!this.issuesSource && selected.board.sprints?.length) {
          await this.setIssuesSourceCommand({ source: selected.board.sprints[0], type: "sprint" })
        }
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Remove search item
   */
  private async removeSearchItemCommand(
    item: SearchProjectTreeItem | SearchSavedSearchTreeItem | SearchAgileTreeItem,
  ): Promise<void> {
    try {
      logger.info(`Removing search item: ${item.label}`)

      switch (true) {
        case item instanceof SearchProjectTreeItem: {
          // Remove project
          this._projects = this._projects.filter((p) => p.id !== item.id)
          await this.cache.saveSelectedProjects(this._projects)

          // Clear active source if it was this project
          if (this.issuesSource?.type === "project" && this.issuesSource?.source.id === item.id) {
            await this.setIssuesSourceCommand(undefined)
          }

          break
        }

        case item instanceof SearchSavedSearchTreeItem: {
          // Remove saved search
          this._savedSearches = this._savedSearches.filter((s) => s.id !== item.id)
          await this.cache.saveSavedSearches(this._savedSearches)

          // Clear active source if it was this search
          if (this.issuesSource?.type === "search" && this.issuesSource?.source.id === item.id) {
            await this.setIssuesSourceCommand(undefined)
          }

          break
        }

        case item instanceof SearchAgileTreeItem: {
          // Remove agile board
          this._agileBoards = this._agileBoards.filter((b) => b.id !== item.id)
          await this.cache.saveAgileBoards(this._agileBoards)

          // Clear active source if it was this board or one of its sprints
          if (
            this.issuesSource?.type === "sprint" &&
            this._agileBoards.some(
              (b) => b.id === item.id && b.sprints?.some((s) => s.id === this.issuesSource?.source?.id),
            )
          ) {
            await this.setIssuesSourceCommand(undefined)
          }

          break
        }
      }

      // Update active source in global state to match memory
      // await this.context.globalState.update("issuesSource", this._activeSource)

      this.refresh()
    } catch (error) {
      logger.error(`Error removing search item: ${error}`)
      vscode.window.showErrorMessage(`Failed to remove item: ${error}`)
    }
  }

  /**
   * Set active search source (project, saved search, or agile board)
   * @param source The source to set as active
   */
  async setIssuesSourceCommand(source: IssuesSource | undefined): Promise<void> {
    logger.info(`Setting active search source: ${source?.type || "none"}`)

    // Update workspace state (using extension context global state instead of workspace service cache)
    await this.context.globalState.update("issuesSource", source)

    // Fire event to notify components about change
    this._vscodeService.changeIssuesSource(source)

    // Refresh to highlight current active source
    this.refresh()
  }
}
