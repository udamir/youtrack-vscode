import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import { createLoadingItem } from "./tree-view-utils"
import type { ProjectEntity } from "../models"
import * as logger from "../utils/logger"
import type { YouTrackService } from "../services/youtrack-client"
import type { CacheService } from "../services/cache-service"
import { COMMAND_SET_ACTIVE_PROJECT } from "../consts/vscode"

/**
 * Event fired when the active project changes
 */
export interface ProjectChangeEvent {
  project: ProjectEntity | undefined
}

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
export class ProjectsTreeDataProvider extends BaseTreeDataProvider {
  private _selectedProjects: ProjectEntity[] = []
  private _activeProject?: ProjectEntity
  private _onDidChangeActiveProject = new vscode.EventEmitter<ProjectChangeEvent>()
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Event that fires when the active project changes
   */
  public readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event

  get activeProjectKey(): string | undefined {
    return this._activeProject?.shortName
  }

  set activeProjectKey(key: string | undefined) {
    this.activeProject = this.selectedProjects.find((project) => project.shortName === key)
  }

  get selectedProjects(): ProjectEntity[] {
    return [...this._selectedProjects]
  }

  set selectedProjects(value: ProjectEntity[]) {
    this._selectedProjects = [...value]
    this._cacheService.saveSelectedProjects(this._selectedProjects)
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }

  set activeProject(value: ProjectEntity | undefined) {
    this._activeProject = value
    this._cacheService.saveActiveProject(this._activeProject?.shortName)
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
    this.activeProjectKey = this._cacheService.getActiveProject()

    // Remove loading state and refresh view
    this.isLoading = false
  }

  /**
   * Add a project to the selected projects list
   */
  public addProject(project: ProjectEntity): void {
    // Check if project already exists
    if (!this.selectedProjects.some((p) => p.shortName === project.shortName)) {
      this.selectedProjects = [...this.selectedProjects, project]
      this.refresh()
    }
  }

  /**
   * Remove a project from the selected projects list
   */
  public removeProject(projectShortName: string): void {
    const initialLength = this.selectedProjects.length
    this.selectedProjects = this.selectedProjects.filter((p) => p.shortName !== projectShortName)

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
  public setActiveProject(projectShortName: string | undefined): void {
    if (projectShortName === this.activeProjectKey) {
      return // No change needed
    }

    this.activeProjectKey = projectShortName

    // Emit change event
    this._onDidChangeActiveProject.fire({ project: this.activeProject })

    // Refresh the view to update the UI
    this.refresh()
  }
}
