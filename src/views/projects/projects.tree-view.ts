import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { BaseTreeView, YouTrackTreeItem, createLoadingItem } from "../base"

import {
  VIEW_PROJECTS,
  COMMAND_ADD_PROJECT,
  COMMAND_REMOVE_PROJECT,
  COMMAND_SET_ACTIVE_PROJECT,
  COMMAND_OPEN_SETTINGS,
} from "./projects.consts"
import type { YouTrackService, VSCodeService, CacheService } from "../../services"
import { YoutrackFilesService, CONFIG_TEMP_FOLDER_PATH } from "../../services"
import { ProjectTreeItem, YoutrackFileTreeItem } from "./projects.tree-item"
import { registerEditorCommands } from "./youtrack-file.commands"
import type { ProjectEntity } from "./projects.types"

/**
 * Tree data provider for YouTrack Projects view
 */
export class ProjectsTreeView extends BaseTreeView<ProjectTreeItem | YouTrackTreeItem> {
  private _selectedProjects: ProjectEntity[] = []
  private _activeProject?: ProjectEntity
  protected readonly subscriptions: vscode.Disposable[] = []

  // File editor service
  private _fileEditorService: YoutrackFilesService

  static register(
    context: vscode.ExtensionContext,
    youtrackService: YouTrackService,
    vscodeService: VSCodeService,
  ): ProjectsTreeView {
    return new ProjectsTreeView(context, youtrackService, vscodeService)
  }

  /**
   * Initialize Projects Tree View
   * @param context VS Code extension context
   * @param _youtrackService YouTrack service
   * @param _vscodeService View service
   * @param _cacheService Cache service
   */
  constructor(
    context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_PROJECTS, context)

    // Initialize file editor service
    this._fileEditorService = new YoutrackFilesService(this._youtrackService, this._vscodeService)
    this.subscriptions.push(this._fileEditorService)

    // Listen for active project changes from ViewService
    this.subscriptions.push(this._vscodeService.onDidChangeActiveProject(() => this.refresh()))
    this.subscriptions.push(this._vscodeService.onServerChanged(() => this.loadFromCache()))

    // Listen for file changes
    this.subscriptions.push(
      this._fileEditorService.onDidChangeEditedFiles(() => {
        this.refresh()
      }),
    )

    // Register commands
    this.registerCommand(COMMAND_ADD_PROJECT, this.addProjectHandler.bind(this))
    this.registerCommand(COMMAND_REMOVE_PROJECT, this.removeProject.bind(this))
    this.registerCommand(COMMAND_SET_ACTIVE_PROJECT, this.setActiveProject.bind(this))
    this.registerCommand(COMMAND_OPEN_SETTINGS, this.openSettings.bind(this))

    // Register editor commands for YouTrack files
    registerEditorCommands(this.context, this._fileEditorService)

    // Load state from cache
    this.loadFromCache()
  }

  public get cache(): CacheService {
    return this._youtrackService.cache
  }

  /**
   * Open settings for editor configuration
   */
  private async openSettings(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.openSettings", CONFIG_TEMP_FOLDER_PATH)
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
    await this._youtrackService.cache.saveSelectedProjects(this._selectedProjects)

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
      const cachedProjects = this.cache.getSelectedProjects()
      if (cachedProjects && cachedProjects.length > 0) {
        this._selectedProjects = cachedProjects
        logger.info(`Loaded ${cachedProjects.length} projects from cache`)

        // Load active project from cache
        const activeProjectKey = this.cache.getActiveProjectKey()
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
        this._vscodeService.changeActiveProject(this._activeProject)
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
    await this.cache.saveSelectedProjects(this._selectedProjects)

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
    await this.cache.saveActiveProject(projectShortName)

    // Notify about the change
    this._vscodeService.changeActiveProject(project)

    logger.info(projectShortName ? `Active project set to: ${projectShortName}` : "No active project set")
    this.refresh()
  }

  /**
   * Get children for a given element
   * @param element Parent element
   */
  async getChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // Initial loading state
    if (this.isLoading) {
      return [createLoadingItem("Loading YouTrack projects...")]
    }

    if (element) {
      // If this is a project element, return edited files for this project
      if (element instanceof ProjectTreeItem && this._fileEditorService) {
        const projectId = element.project.id
        const editedFiles = this._fileEditorService.getEditedFilesForProject(projectId)

        if (editedFiles.length > 0) {
          return editedFiles.map((fileInfo) => new YoutrackFileTreeItem(fileInfo))
        }
      }

      // Default: no children
      return []
    }

    // No element means we're at the root level - return all projects
    if (this._selectedProjects.length === 0) {
      const addProjectItem = YouTrackTreeItem.withThemeIcon(
        "Click the + button to add projects",
        vscode.TreeItemCollapsibleState.None,
        "",
        "youtrack-add-project-hint",
      )
      return [addProjectItem]
    }

    // Return project tree items
    return this._selectedProjects.map((project) => {
      const isActive = project.id === this._activeProject?.id
      const hasEditedFiles = this._fileEditorService.getEditedFilesForProject(project.id).length > 0

      const collapsibleState =
        isActive || hasEditedFiles ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None

      return new ProjectTreeItem(project, collapsibleState, isActive)
    })
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }
}
