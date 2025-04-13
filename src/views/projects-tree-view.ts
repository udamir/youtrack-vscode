import * as vscode from "vscode"

import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import { createLoadingItem } from "./tree-view-utils"

import type { YouTrackService, CacheService } from "../services"
import { COMMAND_SET_ACTIVE_PROJECT } from "../consts"
import type { ProjectEntity } from "../models"
import * as logger from "../utils/logger"

/**
 * Tree item representing a YouTrack project
 */
export class ProjectTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly project: ProjectEntity,
    public readonly isActive: boolean = false,
  ) {
    super(
      project.name,
      vscode.TreeItemCollapsibleState.None,
      // Add command to set this project as active when clicked
      {
        command: COMMAND_SET_ACTIVE_PROJECT,
        title: "Set as Active Project",
        arguments: [{ project }],
      },
      isActive ? "youtrack-project-active" : "youtrack-project",
    )

    // Set description to show the project shortName
    this.description = project.shortName

    // Set tooltip to include description if available
    if (project.description) {
      this.tooltip = `${project.name} (${project.shortName})\n${project.description}`
    } else {
      this.tooltip = `${project.name} (${project.shortName})`
    }

    // Set icon based on active state
    if (isActive) {
      this.iconPath = new vscode.ThemeIcon("circle-filled")
    } else {
      this.iconPath = new vscode.ThemeIcon("circle-outline")
    }
  }
}

/**
 * Tree data provider for YouTrack Projects view
 */
export class ProjectsTreeDataProvider extends BaseTreeDataProvider<ProjectTreeItem | YouTrackTreeItem> {
  private _selectedProjects: ProjectEntity[] = []
  private _activeProject?: ProjectEntity
  private _onDidChangeActiveProject = new vscode.EventEmitter<ProjectEntity | undefined>()
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Event that fires when the active project changes
   */
  public readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event

  get activeProjectKey(): string | undefined {
    return this._activeProject?.shortName
  }

  get selectedProjects(): ProjectEntity[] {
    return [...this._selectedProjects]
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }

  /**
   * Create a new projects tree data provider
   * @param youtrackService The YouTrack service
   * @param cacheService The cache service to use for storing/retrieving projects
   */
  constructor(
    youtrackService: YouTrackService,
    private readonly _cacheService: CacheService,
  ) {
    super(youtrackService)

    // Register for server change events
    this._serverChangeDisposable = this.youtrackService.onServerChanged(this.loadFromCache.bind(this))

    this.loadFromCache()
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this._serverChangeDisposable) {
      this._serverChangeDisposable.dispose()
    }
    this._onDidChangeActiveProject.dispose()
  }

  /**
   * Get children for the Projects view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    logger.info("Getting projects view children")

    if (element) {
      return []
    }

    if (this.isLoading) {
      return [createLoadingItem("Loading projects...")]
    }

    // Display an "Add Project" message if no projects are selected
    if (this.selectedProjects.length === 0) {
      const addProjectItem = YouTrackTreeItem.withThemeIcon(
        "Click the + button to add projects",
        vscode.TreeItemCollapsibleState.None,
        "",
        "youtrack-add-project-hint",
      )
      return [addProjectItem]
    }

    // Convert projects to tree items, marking the active one
    return this.selectedProjects.map(
      (project) => new ProjectTreeItem(project, project.shortName === this.activeProjectKey),
    )
  }

  /**
   * Load projects from cache for the current server
   */
  private loadFromCache(): void {
    // Always show loading state when switching servers
    this.isLoading = true

    // Load projects
    this._selectedProjects = this._cacheService.getSelectedProjects()

    // Load active project short name
    this.setActiveProject(this._cacheService.getActiveProjectKey())

    // Remove loading state and refresh view
    this.isLoading = false
  }

  /**
   * Add a project to the selected projects list
   */
  public async addProject(project: ProjectEntity): Promise<void> {
    // Check if project already exists
    if (!this.selectedProjects.some((p) => p.shortName === project.shortName)) {
      this._selectedProjects = [...this.selectedProjects, project]
      await this._cacheService.saveSelectedProjects(this._selectedProjects)
      this.refresh()
    }
  }

  /**
   * Remove a project from the selected projects list
   */
  public removeProject(projectShortName: string): void {
    const initialLength = this.selectedProjects.length
    this._selectedProjects = this.selectedProjects.filter((p) => p.shortName !== projectShortName)

    // Only persist and refresh if something was actually removed
    if (initialLength !== this.selectedProjects.length) {
      // If the active project was removed, clear the active project reference
      if (this.activeProjectKey === projectShortName) {
        this.setActiveProject(undefined)
      }

      this.refresh()
    }
  }

  /**
   * Set the active project
   * @param projectShortName Short name of the project to set as active, or undefined to clear active project
   */
  public async setActiveProject(projectShortName: string | undefined): Promise<void> {
    if (projectShortName === this.activeProjectKey) {
      return // No change needed
    }

    // Find the project by short name
    this._activeProject = this._selectedProjects.find((p) => p.shortName === projectShortName)

    // Save to cache so it persists across VS Code restarts
    await this._cacheService.saveActiveProject(projectShortName)

    // Emit change event
    this._onDidChangeActiveProject.fire(this._activeProject)

    // Refresh the view to update the UI
    this.refresh()
  }
}
