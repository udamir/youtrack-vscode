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
} from "./sync-files.consts"

import { SyncFileTreeItem, SyncFileProjectGroupItem } from "./sync-files.tree-item"
import type { YouTrackService, VSCodeService, CacheService } from "../../services"
import { YoutrackFilesService, FILE_STATUS_SYNCED } from "../../services"
import type { YoutrackFileData } from "../../services/yt-files/yt-files.types"
import type { FilesViewMode } from "./sync-files.types"

/**
 * Tree data provider for YouTrack Sync Files view
 */
export class SyncFilesTreeView extends BaseTreeView<SyncFileTreeItem | SyncFileProjectGroupItem | YouTrackTreeItem> {
  // File editor service
  private _fileEditorService: YoutrackFilesService

  // View mode (list or tree)
  private _viewMode: FilesViewMode = FILES_VIEW_MODE_LIST

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

    // Initialize file editor service
    this._fileEditorService = new YoutrackFilesService(this._youtrackService, this._vscodeService)
    this.subscriptions.push(this._fileEditorService)

    // Listen for server changes
    this.subscriptions.push(this._vscodeService.onServerChanged(() => this.refresh()))

    // Listen for file changes
    this.subscriptions.push(this._fileEditorService.onDidChangeEditedFiles(() => this.refresh()))

    // Register commands
    this.registerCommand(COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_LIST, this.setListViewMode.bind(this))
    this.registerCommand(COMMAND_TOGGLE_SYNC_FILES_VIEW_MODE_TREE, this.setTreeViewMode.bind(this))
    this.registerCommand("youtrack.openSyncFile", this.openSyncFileCommand.bind(this))
    this.registerCommand(COMMAND_EDIT_ENTITY, this.editEntityCommand.bind(this))

    // Load view mode from cache
    this.loadViewMode()
  }

  /**
   * Accessor for cache service
   */
  public get cache(): CacheService {
    return this._vscodeService.cache
  }

  /**
   * Load view mode from cache
   */
  private async loadViewMode(): Promise<void> {
    const viewMode = this.cache.getFilesViewMode()
    if (viewMode) {
      this._viewMode = viewMode
      await this.updateViewModeContext(viewMode)
    }
  }

  /**
   * Set list view mode
   */
  public async setListViewMode(): Promise<void> {
    this._viewMode = FILES_VIEW_MODE_LIST
    await this.cache.saveFilesViewMode(FILES_VIEW_MODE_LIST)
    await this.updateViewModeContext(FILES_VIEW_MODE_LIST)
    this.refresh()
  }

  /**
   * Set tree view mode
   */
  public async setTreeViewMode(): Promise<void> {
    this._viewMode = FILES_VIEW_MODE_TREE
    await this.cache.saveFilesViewMode(FILES_VIEW_MODE_TREE)
    await this.updateViewModeContext(FILES_VIEW_MODE_TREE)
    this.refresh()
  }

  /**
   * Update context for view mode
   */
  private async updateViewModeContext(viewMode: FilesViewMode): Promise<void> {
    await vscode.commands.executeCommand("setContext", "youtrack.filesViewMode", viewMode)
  }

  /**
   * Open sync file command
   */
  private async openSyncFileCommand(fileData: YoutrackFileData): Promise<void> {
    try {
      if (fileData?.filePath) {
        await vscode.window.showTextDocument(vscode.Uri.file(fileData.filePath))
      } else {
        throw new Error("Invalid file data or missing file path")
      }
    } catch (e) {
      logger.error("Error opening sync file", e)
    }
  }

  /**
   * Edit entity command (open issue/article by ID)
   */
  private async editEntityCommand(): Promise<void> {
    try {
      const entityId = await vscode.window.showInputBox({
        prompt: "Enter YouTrack issue or article ID (e.g. PROJECT-123)",
        placeHolder: "PROJECT-123",
      })

      if (!entityId) {
        return
      }

      await this._fileEditorService.openInEditor(entityId)
    } catch (error) {
      logger.error(`Error opening entity in editor: ${error}`)
      vscode.window.showErrorMessage(`Failed to open entity in editor: ${error}`)
    }
  }

  /**
   * Get tree item for given element
   */
  public getTreeItem(element: SyncFileTreeItem | SyncFileProjectGroupItem | YouTrackTreeItem): vscode.TreeItem {
    return element
  }

  /**
   * Create a text item that fits into the expected tree item types
   */
  private createSyncTextItem(label: string, _description?: string, contextValue?: string): YouTrackTreeItem {
    return new YouTrackTreeItem(label, vscode.TreeItemCollapsibleState.None, undefined, contextValue)
  }

  /**
   * Get children for the tree view
   */
  public async getChildren(
    element?: SyncFileProjectGroupItem,
  ): Promise<(SyncFileTreeItem | SyncFileProjectGroupItem | YouTrackTreeItem)[]> {
    // Get all edited files from file editor service
    const syncFiles = this._fileEditorService.getEditedFiles()

    if (!syncFiles || syncFiles.length === 0) {
      return [this.createSyncTextItem("No edited files found.")]
    }

    // Group by project in tree view mode if no element is provided
    if (!element && this._viewMode === FILES_VIEW_MODE_TREE) {
      // Root level - group by project
      const projects = new Map<string, string>()

      // Collect unique projects with their names
      syncFiles.forEach((file: YoutrackFileData) => {
        if (file.projectKey && !projects.has(file.projectKey)) {
          // Use projectKey as name since YoutrackFileData doesn't have projectName
          projects.set(file.projectKey, file.projectKey)
        }
      })

      // Return project groups
      return Array.from(projects.entries()).map(
        ([projectId, projectName]) => new SyncFileProjectGroupItem(projectId, projectName, 0),
      )
    }

    if (element && this._viewMode === FILES_VIEW_MODE_TREE) {
      // Project level - show files for this project
      const projectFiles = syncFiles.filter((file: YoutrackFileData) => file.projectKey === element.projectId)

      return projectFiles.map(
        (file: YoutrackFileData) =>
          new SyncFileTreeItem(
            file.metadata.idReadable, // Use idReadable as id
            file.metadata.idReadable,
            file.projectKey,
            file.syncStatus,
            file.syncStatus !== FILE_STATUS_SYNCED,
          ),
      )
    }

    // List view mode - show all files in a flat list
    return syncFiles.map(
      (file: YoutrackFileData) =>
        new SyncFileTreeItem(
          file.metadata.idReadable, // Use idReadable as id
          file.metadata.idReadable,
          file.projectKey,
          file.syncStatus,
          file.syncStatus !== FILE_STATUS_SYNCED,
        ),
    )
  }
}
