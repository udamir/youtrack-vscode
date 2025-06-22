import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { BaseTreeView, YouTrackTreeItem } from "../base"

import {
  VIEW_SYNC_FILES,
  COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_LIST,
  COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_TREE,
  FILES_VIEW_MODE_LIST,
  FILES_VIEW_MODE_TREE,
  COMMAND_EDIT_ENTITY,
  COMMAND_NEW_SYNC_FILE,
} from "./sync-files.consts"

import type { YouTrackService, VSCodeService, CacheService, YoutrackFileData } from "../../services"
import { YoutrackFilesService, FILE_STATUS_SYNCED } from "../../services"
import type { FilesViewMode } from "./sync-files.types"
import { ProjectTreeItem } from "./sync-files.tree-item"
import {
  COMMAND_FETCH_FROM_YOUTRACK,
  COMMAND_OPEN_SETTINGS,
  COMMAND_SAVE_TO_YOUTRACK,
  COMMAND_UNLINK_FILE,
  YoutrackFileTreeItem,
} from "../projects"
import type { ProjectEntity } from "../searches"

/**
 * Tree data provider for YouTrack Sync Files view
 */
export class SyncFilesTreeView extends BaseTreeView<YoutrackFileTreeItem | ProjectTreeItem | YouTrackTreeItem> {
  // File editor service
  private _fileEditorService: YoutrackFilesService

  // View mode (list or tree)
  private _viewMode: FilesViewMode = FILES_VIEW_MODE_LIST
  private _projects: ProjectEntity[] = []

  /**
   * Factory method to register the view
   */
  static register(
    context: vscode.ExtensionContext,
    youtrackService: YouTrackService,
    vscodeService: VSCodeService,
  ): SyncFilesTreeView {
    return new SyncFilesTreeView(context, youtrackService, vscodeService)
  }

  /**
   * Initialize Sync Files Tree View
   */
  constructor(
    context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_SYNC_FILES, context)
    this._viewMode = this.cache.getFilesViewMode() || FILES_VIEW_MODE_LIST
    // Set initial view mode context
    void vscode.commands.executeCommand("setContext", "youtrack.filesViewMode", this._viewMode)

    // Initialize file editor service
    this._fileEditorService = new YoutrackFilesService(this._youtrackService, this._vscodeService)
    this.subscriptions.push(this._fileEditorService)

    // Listen for server changes
    this.subscriptions.push(
      this._vscodeService.onServerChanged(() => {
        this.loadProjectsFromFiles()
        this.refresh()
      }),
    )

    // Listen for file changes
    this.subscriptions.push(
      this._fileEditorService.onDidChangeEditedFiles(() => {
        this.loadProjectsFromFiles()
        this.refresh()
      }),
    )

    // Initial load of projects
    void this.loadProjectsFromFiles()

    // Register commands
    this.registerCommand(COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_LIST, this.toggleViewMode.bind(this))
    this.registerCommand(COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_TREE, this.toggleViewMode.bind(this))
    this.registerCommand(COMMAND_OPEN_SETTINGS, this.openSettingsCommand.bind(this))
    this.registerCommand(COMMAND_FETCH_FROM_YOUTRACK, this.fetchFromYoutrackCommand.bind(this))
    this.registerCommand(COMMAND_SAVE_TO_YOUTRACK, this.saveToYoutrackCommand.bind(this))
    this.registerCommand(COMMAND_UNLINK_FILE, this.unlinkFileCommand.bind(this))
    this.registerCommand(COMMAND_EDIT_ENTITY, this.editorEntityCommand.bind(this))
    this.registerCommand(COMMAND_NEW_SYNC_FILE, this.editorEntityCommand.bind(this))
  }

  /**
   * Accessor for cache service
   */
  public get cache(): CacheService {
    return this._vscodeService.cache
  }

  /**
   * Toggle between list and tree view mode
   */
  public async toggleViewMode(): Promise<void> {
    const newMode = this._viewMode === FILES_VIEW_MODE_LIST ? FILES_VIEW_MODE_TREE : FILES_VIEW_MODE_LIST
    await vscode.commands.executeCommand("setContext", "youtrack.filesViewMode", newMode)
    this._viewMode = newMode
    await this.cache.saveFilesViewMode(this._viewMode)
    this.refresh()
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

  /**
   * Edit entity command (open issue/article by ID)
   * @param item Optional entity ID to edit directly
   */
  private async editorEntityCommand(item?: YouTrackTreeItem) {
    logger.debug(`SyncFilesTreeView: Editor entity Command: ${item?.id}`)
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
   * Load projects from edited files
   */
  private async loadProjectsFromFiles(): Promise<void> {
    logger.debug("SyncFilesTreeView: Loading projects from edited files")
    // Get all edited files
    const syncFiles = this._fileEditorService.getEditedFiles()
    if (!syncFiles || syncFiles.length === 0) {
      return
    }

    try {
      // Get all projects from YouTrack
      const projects = await this._youtrackService.getProjects()
      if (!projects || projects.length === 0) {
        return
      }

      // Create a map of project IDs to project entities
      const projectsMap = new Map<string, ProjectEntity>()
      projects.forEach((project) => {
        if (project.shortName) {
          projectsMap.set(project.shortName, project)
        }
      })

      // Extract unique project keys from sync files
      const uniqueProjectKeys = new Set<string>()
      syncFiles.forEach((file) => {
        if (file.projectKey && !uniqueProjectKeys.has(file.projectKey)) {
          uniqueProjectKeys.add(file.projectKey)
        }
      })

      // Create project entities for each unique project key
      this._projects = Array.from(uniqueProjectKeys).map((projectKey) => {
        // Try to find project in projectsMap
        const project = projectsMap.get(projectKey)
        if (project) {
          return project
        }

        // Create a simple project entity if not found
        return {
          id: projectKey,
          name: projectKey,
          shortName: projectKey,
        } as ProjectEntity
      })
    } catch (error) {
      logger.error(`Error loading projects: ${error}`)
    }
  }

  /**
   * Get children for the tree view
   */
  public async getChildren(
    element?: ProjectTreeItem,
  ): Promise<(ProjectTreeItem | YoutrackFileTreeItem | YouTrackTreeItem)[]> {
    // Get all edited files from file editor service
    const syncFiles = this._fileEditorService.getEditedFiles()

    if (!syncFiles || syncFiles.length === 0) {
      return [new YouTrackTreeItem("No edited files found.")]
    }

    // Group by project in tree view mode if no element is provided
    if (!element && this._viewMode === FILES_VIEW_MODE_TREE) {
      // Root level - group by project
      return this._projects.map((project) => new ProjectTreeItem(project, vscode.TreeItemCollapsibleState.Collapsed))
    }

    // Show files for a specific project when a project is selected
    if (element instanceof ProjectTreeItem) {
      return syncFiles
        .filter((file: YoutrackFileData) => file.projectKey === element.project.shortName)
        .map((file: YoutrackFileData) => new YoutrackFileTreeItem(file))
    }

    // List view mode - show all files in a flat list
    return syncFiles.map((file: YoutrackFileData) => new YoutrackFileTreeItem(file))
  }
}
