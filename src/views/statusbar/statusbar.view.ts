import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { StatusBarState } from "./statusbar.types"
import type { YouTrackService, AuthState } from "../../services/youtrack"
import { AUTHENTICATED, AUTHENTICATION_FAILED, NOT_AUTHENTICATED } from "../../services/youtrack"
import { COMMAND_CONNECT } from "../auth/auth.consts"

/**
 * Factory for creating VS Code status bar items (allows for easier testing)
 */
export interface StatusBarItemFactory {
  createStatusBarItem(alignment?: vscode.StatusBarAlignment, priority?: number): vscode.StatusBarItem
}

/**
 * Default implementation of StatusBarItemFactory using VS Code API
 */
export class VSCodeStatusBarItemFactory implements StatusBarItemFactory {
  createStatusBarItem(alignment = vscode.StatusBarAlignment.Left, priority = 100): vscode.StatusBarItem {
    return vscode.window.createStatusBarItem(alignment, priority)
  }
}

/**
 * Service for managing the YouTrack status bar item
 */
export class StatusBarView {
  protected subscriptions: vscode.Disposable[] = []
  private readonly statusBarItem: vscode.StatusBarItem

  constructor(
    protected readonly context: vscode.ExtensionContext,
    private readonly youtrackService?: YouTrackService,
    private readonly factory: StatusBarItemFactory = new VSCodeStatusBarItemFactory(),
  ) {
    // Create status bar item with medium priority (higher number = further to the left)
    this.statusBarItem = this.factory.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.subscriptions.push(this.statusBarItem)

    // Set the command to run when clicked
    this.statusBarItem.command = COMMAND_CONNECT

    // Show the status bar item
    this.statusBarItem.show()

    // Initialize with disconnected state
    this.updateState(StatusBarState.NotAuthenticated)

    // Subscribe to auth state changes if YouTrack service is provided
    if (this.youtrackService) {
      this.subscriptions.push(this.youtrackService.onAuthStateChanged(this.handleAuthStateChange.bind(this)))

      // Set initial state based on current connection
      if (this.youtrackService.isConnected()) {
        this.updateState(StatusBarState.Authenticated, this.youtrackService.baseUrl)
      }
    }

    this.context.subscriptions.push(this)
  }

  /**
   * Handle authentication state changes from YouTrack service
   */
  private handleAuthStateChange(state: AuthState): void {
    logger.debug(`Status bar received auth state change: ${state}`)

    switch (state) {
      case AUTHENTICATED:
        this.updateState(StatusBarState.Authenticated, this.youtrackService?.baseUrl)
        break
      case NOT_AUTHENTICATED:
        this.updateState(StatusBarState.NotAuthenticated)
        break
      case AUTHENTICATION_FAILED:
        this.updateState(StatusBarState.Error)
        break
    }
  }

  /**
   * Update the status bar state and appearance
   */
  public updateState(state: StatusBarState, instanceUrl?: string): void {
    // Update status bar item appearance based on state
    switch (state) {
      case StatusBarState.Authenticated:
        this.statusBarItem.text = "$(check) YouTrack"
        this.statusBarItem.tooltip = `Connected to YouTrack: ${instanceUrl}`
        this.statusBarItem.backgroundColor = undefined
        break
      case StatusBarState.NotAuthenticated:
        this.statusBarItem.text = "$(x) YouTrack"
        this.statusBarItem.tooltip = "Not connected to YouTrack - Click to connect"
        this.statusBarItem.backgroundColor = undefined
        break
      case StatusBarState.Error:
        this.statusBarItem.text = "$(alert) YouTrack"
        this.statusBarItem.tooltip = "Error connecting to YouTrack - Click to reconnect"
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")
        break
    }

    logger.info(`Status bar updated: ${state}${instanceUrl ? ` (${instanceUrl})` : ""}`)
  }

  /**
   * Dispose the status bar item
   */
  public dispose(): void {
    this.subscriptions.forEach((d) => d.dispose())
    this.subscriptions = []
  }
}
