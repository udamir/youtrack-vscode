import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import { createLoadingItem } from "./tree-view-utils"
import type { Project } from "../models/project"
import * as logger from "../utils/logger"
import type { YouTrackService } from "../services/youtrack-client"
import type { CacheService } from "../services/cache-service"
import { COMMAND_SET_ACTIVE_PROJECT } from "../constants"

/**
 * Event fired when the active project changes
 */
export interface ProjectChangeEvent {
  projectId: string | undefined
  project: Project | undefined
}

/**
 * Tree item representing a YouTrack project
 */
export class ProjectTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly project: Project,
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
  private _selectedProjects: Project[] = []
  private _activeProjectId?: string
  private _onDidChangeActiveProject = new vscode.EventEmitter<ProjectChangeEvent>()
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Event that fires when the active project changes
   */
  public readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event

  get activeProjectId(): string | undefined {
    return this._activeProjectId
  }

  set activeProjectId(value: string | undefined) {
    this._activeProjectId = value
    this._cacheService.saveActiveProjectId(this._activeProjectId)
  }

  get selectedProjects(): Project[] {
    return [...this._selectedProjects]
  }

  set selectedProjects(value: Project[]) {
    this._selectedProjects = [...value]
    this._cacheService.saveSelectedProjects(this._selectedProjects)
  }

  get activeProject(): Project | undefined {
    if (!this._activeProjectId) {
      return undefined
    }
    return this._selectedProjects.find((p) => p.id === this._activeProjectId)
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
    if (this._selectedProjects.length === 0) {
      const addProjectItem = YouTrackTreeItem.withThemeIcon(
        "Click the + button to add projects",
        vscode.TreeItemCollapsibleState.None,
        "",
        "youtrack-add-project-hint",
      )
      return [addProjectItem]
    }

    // Convert projects to tree items, marking the active one
    return this._selectedProjects.map((project) => new ProjectTreeItem(project, project.id === this._activeProjectId))
  }

  /**
   * Load projects from cache for the current server
   */
  private loadFromCache(): void {
    // Always show loading state when switching servers
    this.isLoading = true

    // Load projects
    this._selectedProjects = this._cacheService.getSelectedProjects()

    // Load active project ID
    this._activeProjectId = this._cacheService.getActiveProjectId()

    // If we have an active project ID but it's not in the selected projects,
    // clear the active project ID
    if (this._activeProjectId && !this._selectedProjects.some((p) => p.id === this._activeProjectId)) {
      logger.warn(`Active project ${this._activeProjectId} not found in selected projects, clearing active project`)
      this.activeProjectId = undefined
    }

    // Remove loading state and refresh view
    this.isLoading = false
  }

  /**
   * Add a project to the selected projects list
   */
  public addProject(project: Project): void {
    // Check if project already exists
    if (!this._selectedProjects.some((p) => p.id === project.id)) {
      this.selectedProjects = [...this._selectedProjects, project]
      this.refresh()
    }
  }

  /**
   * Remove a project from the selected projects list
   */
  public removeProject(projectId: string): void {
    const initialLength = this._selectedProjects.length
    this.selectedProjects = this._selectedProjects.filter((p) => p.id !== projectId)

    // Only persist and refresh if something was actually removed
    if (initialLength !== this._selectedProjects.length) {
      // If the active project was removed, clear the active project reference
      if (this._activeProjectId === projectId) {
        this.setActiveProject(undefined)
      }

      this.refresh()
    }
  }

  /**
   * Set the active project
   * @param projectId ID of the project to set as active, or undefined to clear active project
   */
  public setActiveProject(projectId: string | undefined): void {
    if (projectId === this._activeProjectId) {
      return // No change needed
    }

    this.activeProjectId = projectId

    // Find the project object if we have an ID
    const project = projectId ? this._selectedProjects.find((p) => p.id === projectId) : undefined

    // Emit change event
    this._onDidChangeActiveProject.fire({
      projectId,
      project,
    })

    // Refresh the view to update the UI
    this.refresh()
  }
}
