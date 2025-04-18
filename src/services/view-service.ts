import * as vscode from "vscode"
import * as logger from "../utils/logger"
import type { ProjectEntity } from "../views"
import { STATUS_CONNECTED } from "./vscode"

/**
 * Service for managing VS Code views and UI components
 * Also serves as a central state manager and message broker for events
 */
export class ViewService implements vscode.Disposable {
  // State
  private _activeProject?: ProjectEntity

  // Event emitters to notify components of state changes
  private readonly _onDidChangeActiveProject = new vscode.EventEmitter<ProjectEntity | undefined>()
  private readonly _onDidRefreshViews = new vscode.EventEmitter<void>()

  // Public events that components can subscribe to
  public readonly onDidChangeActiveProject = this._onDidChangeActiveProject.event
  public readonly onDidRefreshViews = this._onDidRefreshViews.event

  // Disposables to clean up when the service is disposed
  private readonly _disposables: vscode.Disposable[] = [this._onDidChangeActiveProject, this._onDidRefreshViews]

  /**
   * Get the active project
   */
  get activeProject(): ProjectEntity | undefined {
    return this._activeProject
  }

  /**
   * Get active project key
   */
  public get activeProjectKey(): string | undefined {
    return this._activeProject?.shortName
  }

  /**
   * Set the active project by short name
   */
  async changeActiveProject(project?: ProjectEntity): Promise<void> {
    // Notify about the change
    this._activeProject = project
    this._onDidChangeActiveProject.fire(project)
  }

  /**
   * Fire the refresh views event to refresh all views
   */
  public refreshViews(): void {
    logger.info("Firing refresh views event")
    this._onDidRefreshViews.fire()
  }

  /**
   * Toggle the visibility of views based on configuration state
   * @param isConfigured Whether the extension is configured
   */
  public async toggleViewsVisibility(isConfigured: boolean): Promise<void> {
    logger.info(`Toggling views visibility. isConfigured=${isConfigured}`)

    // Update context to control view visibility based on connection status
    await vscode.commands.executeCommand("setContext", STATUS_CONNECTED, isConfigured)

    if (isConfigured) {
      // If configured, refresh everything to make sure the latest data is shown
      this.refreshViews()
    }
  }

  /**
   * Dispose of the service and all its resources
   */
  public dispose(): void {
    logger.info("Disposing ViewService")

    // Dispose of event emitters and other disposables
    this._disposables.forEach((d) => d.dispose())

    // Clear state
    this._activeProject = undefined

    logger.info("ViewService disposed")
  }
}
