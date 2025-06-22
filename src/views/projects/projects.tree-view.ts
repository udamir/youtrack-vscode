import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { BaseTreeView, YouTrackTreeItem, createLoadingItem } from "../base"

import {
  VIEW_PROJECTS,
  COMMAND_ADD_PROJECT,
  COMMAND_REMOVE_PROJECT,
  COMMAND_SET_ACTIVE_PROJECT,
  COMMAND_OPEN_SETTINGS,
  COMMAND_FETCH_FROM_YOUTRACK,
  COMMAND_SAVE_TO_YOUTRACK,
  COMMAND_UNLINK_FILE,
  COMMAND_EDIT_ENTITY,
} from "./projects.consts"
import type { YouTrackService, VSCodeService, CacheService } from "../../services"
import { YoutrackFilesService, FILE_STATUS_SYNCED } from "../../services"
import { ProjectTreeItem, YoutrackFileTreeItem } from "./projects.tree-item"
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
    this.subscriptions.push(this._vscodeService.onDidChangeIssuesSource(() => this.refresh()))
    this.subscriptions.push(this._vscodeService.onServerChanged(() => this.loadFromCache()))

    // Listen for file changes
    this.subscriptions.push(this._fileEditorService.onDidChangeEditedFiles(() => this.refresh()))

    // Register commands
    this.registerCommand(COMMAND_ADD_PROJECT, this.addProjectCommand.bind(this))
    this.registerCommand(COMMAND_REMOVE_PROJECT, this.removeProjectCommand.bind(this))
    this.registerCommand(COMMAND_SET_ACTIVE_PROJECT, this.setActiveProjectCommand.bind(this))
    this.registerCommand(COMMAND_OPEN_SETTINGS, this.openSettingsCommand.bind(this))
    this.registerCommand(COMMAND_FETCH_FROM_YOUTRACK, this.fetchFromYoutrackCommand.bind(this))
    this.registerCommand(COMMAND_SAVE_TO_YOUTRACK, this.saveToYoutrackCommand.bind(this))
    this.registerCommand(COMMAND_UNLINK_FILE, this.unlinkFileCommand.bind(this))
    this.registerCommand(COMMAND_EDIT_ENTITY, this.editorEntityCommand.bind(this))

    // Load state from cache
    this.loadFromCache()
  }

  public get cache(): CacheService {
    return this._vscodeService.cache
  }

  /**
   * Open settings for editor configuration
   */
  private async openSettingsCommand(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.openSettings", "youtrack")
  }

  // Register fetch from YouTrack command
  private async fetchFromYoutrackCommand(fileItem: YoutrackFileTreeItem) {
    logger.debug(`ProjectsTreeView: Fetching from YouTrack Command: ${fileItem.fileInfo.metadata.idReadable}`)
    try {
      await this._fileEditorService.fetchFromYouTrack(fileItem.fileInfo)
      fileItem.fileInfo.syncStatus = FILE_STATUS_SYNCED
      this.refresh()
    } catch (error) {
      logger.error(`Error fetching from YouTrack: ${error}`)
      vscode.window.showErrorMessage(`Failed to fetch from YouTrack: ${error}`)
    }
  }

  private async saveToYoutrackCommand(fileItem: YoutrackFileTreeItem) {
    logger.debug(`ProjectsTreeView: Saving to YouTrack Command: ${fileItem.fileInfo.metadata.idReadable}`)
    try {
      await this._fileEditorService.saveToYouTrack(fileItem.fileInfo)
      fileItem.fileInfo.syncStatus = FILE_STATUS_SYNCED
      this.refresh()
    } catch (error) {
      logger.error(`Error saving to YouTrack: ${error}`)
      vscode.window.showErrorMessage(`Failed to save to YouTrack: ${error}`)
    }
  }

  private async unlinkFileCommand(fileItem: YoutrackFileTreeItem) {
    logger.debug(`ProjectsTreeView: Unlinking file Command: ${fileItem.fileInfo.metadata.idReadable}`)
    try {
      await this._fileEditorService.unlinkFile(fileItem.fileInfo)
      this.refresh()
    } catch (error) {
      logger.error(`Error unlinking file: ${error}`)
      vscode.window.showErrorMessage(`Failed to unlink file: ${error}`)
    }
  }

  private async editorEntityCommand(item?: YouTrackTreeItem) {
    logger.debug(`ProjectsTreeView: Editor entity Command: ${item?.id}`)
    try {
      if (!item?.id) {
        const issueIdReadable = await vscode.window.showInputBox({
          prompt: "Enter YouTrack issue or article ID (e.g. PROJECT-123)",
          placeHolder: "PROJECT-123",
        })

        if (!issueIdReadable) {
          return
        }

        await this._fileEditorService.openInEditor(issueIdReadable)
      } else {
        await this._fileEditorService.openInEditor(item.id)
      }
    } catch (error) {
      logger.error(`Error opening issue in editor: ${error}`)
      vscode.window.showErrorMessage(`Failed to open issue in editor: ${error}`)
    }
  }

  /**
   * Execute the add project command
   */
  async addProjectCommand(): Promise<void> {
    logger.debug("ProjectsTreeView: Add project Command")
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
    await this._vscodeService.cache.saveSelectedProjects(this._selectedProjects)

    // If no active project is set, set this as active project
    if (!this._activeProject) {
      await this.setActiveProjectCommand(project.shortName)
    }
    logger.info(`Project added successfully: ${project.name}`)

    // Refresh the tree view to show the new project
    this.refresh()
  }

  /**
   * Load state from cache
   */
  private loadFromCache(): void {
    logger.info("ProjectsTreeView: Loading state from cache")
    try {
      // Load selected projects from cache
      const cachedProjects = this.cache.getSelectedProjects()
      if (cachedProjects && cachedProjects.length > 0) {
        this._selectedProjects = cachedProjects
        logger.info(`Loaded ${cachedProjects.length} projects from cache`)

        // Load active project from cache
        // const activeProjectKey = this.cache.getActiveProjectKey()
        // if (activeProjectKey) {
        //   const activeProject = cachedProjects.find((p) => p.shortName === activeProjectKey)
        //   if (activeProject) {
        //     this._activeProject = activeProject
        //     logger.info(`Loaded active project from cache: ${activeProject.name}`)
        //   } else {
        //     logger.info(`Active project not found in selected projects: ${activeProjectKey}`)
        //   }
        // }

        // Fire events
        // this._vscodeService.fireDidChangeIssuesSource({ type: "project", source: this._activeProject })
        this.refresh()
      }
    } catch (error) {
      logger.error("Error loading state from cache:", error)
    }
  }

  /**
   * Remove a project from selected projects
   */
  public async removeProjectCommand({ project }: ProjectTreeItem): Promise<void> {
    logger.info(`ProjectsTreeView: Removing project: ${project.shortName}`)

    // Remove project from selected projects
    this._selectedProjects = this._selectedProjects.filter((p) => p.shortName !== project.shortName)

    // Save selected projects to cache
    await this.cache.saveSelectedProjects(this._selectedProjects)

    // If this was the active project, clear active project
    if (this._activeProject && this._activeProject.shortName === project.shortName) {
      // Set active project to first project in list or undefined if empty
      const nextProject = this._selectedProjects.length > 0 ? this._selectedProjects[0] : undefined
      await this.setActiveProjectCommand(nextProject?.shortName)
    }

    // Refresh the UI to show the updated project list
    this.refresh()
  }

  /**
   * Set the active project by short name
   */
  public async setActiveProjectCommand(projectShortName?: string): Promise<void> {
    logger.info(`ProjectsTreeView: Setting active project: ${projectShortName}`)
    // Find the project from selected projects
    const project = projectShortName ? this._selectedProjects.find((p) => p.shortName === projectShortName) : undefined

    if (!project) {
      logger.warn(`Project with short name ${projectShortName} not found in selected projects`)
      return
    }

    // Set active project
    this._activeProject = project

    // Notify about the change
    this._vscodeService.changeIssuesSource({ type: "project", source: project })

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
        const editedFiles = this._fileEditorService.getEditedFilesForProject(element.project.shortName)

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
      const isActive = project.shortName === this._activeProject?.shortName
      const hasEditedFiles = this._fileEditorService.getEditedFilesForProject(project.shortName).length > 0

      const collapsibleState =
        isActive || hasEditedFiles ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None

      return new ProjectTreeItem(project, collapsibleState, isActive)
    })
  }

  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }
}
