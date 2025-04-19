import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { BaseTreeView, YouTrackTreeItem } from "../base"

import type { YouTrackService, ViewService, CacheService } from "../../services"
import { createLoadingItem } from "../base/base.utils"
import {
  VIEW_PROJECTS,
  COMMAND_ADD_PROJECT,
  COMMAND_REMOVE_PROJECT,
  COMMAND_SET_ACTIVE_PROJECT,
} from "./projects.consts"
import { ProjectTreeItem } from "./projects.tree-item"
import type { ProjectEntity } from "./projects.types"

/**
 * Tree data provider for YouTrack Projects view
 */
export class ProjectsTreeView extends BaseTreeView<ProjectTreeItem | YouTrackTreeItem> {
  private _selectedProjects: ProjectEntity[] = []
  private _activeProject?: ProjectEntity

  static register(
    context: vscode.ExtensionContext,
    youtrackService: YouTrackService,
    viewService: ViewService,
    cacheService: CacheService,
  ): ProjectsTreeView {
    return new ProjectsTreeView(context, youtrackService, viewService, cacheService)
  }

  constructor(
    _context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _viewService: ViewService,
    private readonly _cacheService: CacheService,
  ) {
    super(VIEW_PROJECTS, _context)

    // Listen for active project changes from ViewService
    this.subscriptions.push(this._viewService.onDidChangeActiveProject(() => this.refresh()))
    this.subscriptions.push(this._youtrackService.onServerChanged(() => this.loadFromCache()))

    // Register commands
    this.registerCommand(COMMAND_ADD_PROJECT, this.addProjectHandler.bind(this))
    this.registerCommand(COMMAND_REMOVE_PROJECT, this.removeProject.bind(this))
    this.registerCommand(COMMAND_SET_ACTIVE_PROJECT, this.setActiveProject.bind(this))

    // Load state from cache
    this.loadFromCache()
  }

  /**
   * Execute the add project command
   */
  async addProjectHandler(): Promise<void> {
    try {
      // Get all available projects from YouTrack
      const availableProjects = await this._youtrackService.getProjects()

      if (!availableProjects || availableProjects.length === 0) {
        vscode.window.showInformationMessage(
          "No projects available in YouTrack or you don't have access to any projects",
        )
        return
      }

      // Filter out already selected projects
      const unselectedProjects = availableProjects.filter(
        (project) => !this._selectedProjects.some((selected) => selected.id === project.id),
      )

      if (unselectedProjects.length === 0) {
        vscode.window.showInformationMessage("All available projects have already been added")
        return
      }

      // Show project picker and let user select one to add
      const selected = await vscode.window.showQuickPick(
        unselectedProjects.map((p) => ({
          label: p.name,
          description: p.shortName,
          detail: p.description,
          project: p,
        })),
      )

      // Add the selected project
      if (selected) {
        await this.addProject(selected.project)
      }
    } catch (error) {
      logger.error("Error adding project", error)
    }
  }

  public async addProject(project: ProjectEntity): Promise<void> {
    // Check if we are already tracking this project
    if (this._selectedProjects.some((p) => p.shortName === project.shortName)) {
      logger.info(`Project ${project.name} already selected`)
      return
    }

    // Add project to selected projects
    this._selectedProjects.push(project)

    // Save selected projects to cache
    await this._cacheService.saveSelectedProjects(this._selectedProjects)

    // If no active project is set, set this as active project
    if (!this._activeProject) {
      await this.setActiveProject(project.shortName)
    }
    logger.info(`Project added successfully: ${project.name}`)

    // Refresh the tree view to show the new project
    this.refresh()
  }

  /**
   * Load state from cache
   */
  private loadFromCache(): void {
    try {
      // Load selected projects from cache
      const cachedProjects = this._cacheService.getSelectedProjects()
      if (cachedProjects && cachedProjects.length > 0) {
        this._selectedProjects = cachedProjects
        logger.info(`Loaded ${cachedProjects.length} projects from cache`)

        // Load active project from cache
        const activeProjectKey = this._cacheService.getActiveProjectKey()
        if (activeProjectKey) {
          const activeProject = cachedProjects.find((p) => p.shortName === activeProjectKey)
          if (activeProject) {
            this._activeProject = activeProject
            logger.info(`Loaded active project from cache: ${activeProject.name}`)
          } else {
            logger.info(`Active project not found in selected projects: ${activeProjectKey}`)
          }
        }

        // Fire events
        this._viewService.changeActiveProject(this._activeProject)
        this.refresh()
      }
    } catch (error) {
      logger.error("Error loading state from cache:", error)
    }
  }

  /**
   * Remove a project from selected projects
   */
  public async removeProject({ project }: ProjectTreeItem): Promise<void> {
    logger.info(`Removing project: ${project.shortName}`)

    // Remove project from selected projects
    this._selectedProjects = this._selectedProjects.filter((p) => p.shortName !== project.shortName)

    // Save selected projects to cache
    await this._cacheService.saveSelectedProjects(this._selectedProjects)

    // If this was the active project, clear active project
    if (this._activeProject && this._activeProject.shortName === project.shortName) {
      // Set active project to first project in list or undefined if empty
      const nextProject = this._selectedProjects.length > 0 ? this._selectedProjects[0] : undefined
      await this.setActiveProject(nextProject?.shortName)
    }

    // Refresh the UI to show the updated project list
    this.refresh()
  }

  /**
   * Set the active project by short name
   */
  public async setActiveProject(projectShortName?: string): Promise<void> {
    // Find the project from selected projects
    const project = projectShortName ? this._selectedProjects.find((p) => p.shortName === projectShortName) : undefined

    if (!project && projectShortName) {
      logger.warn(`Project with short name ${projectShortName} not found in selected projects`)
      return
    }

    // Set active project
    this._activeProject = project

    // Save active project to cache
    await this._cacheService.saveActiveProject(projectShortName)

    // Notify about the change
    this._viewService.changeActiveProject(project)

    logger.info(projectShortName ? `Active project set to: ${projectShortName}` : "No active project set")
    this.refresh()
  }

  /**
   * Get children for the Projects view when configured
   */
  public async getChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
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
    return this._selectedProjects.map(
      (project) => new ProjectTreeItem(project, project.shortName === this._activeProject?.shortName),
    )
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }
}
