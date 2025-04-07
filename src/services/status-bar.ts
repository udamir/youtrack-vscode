import * as vscode from "vscode"
import { COMMAND_CONNECT } from "../constants"
import * as logger from "../utils/logger"

/**
 * Status bar states
 */
export enum StatusBarState {
  Authenticated = "authenticated",
  NotAuthenticated = "not-authenticated",
  Error = "error",
}

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
export class StatusBarService {
  private statusBarItem: vscode.StatusBarItem

  constructor(private readonly factory: StatusBarItemFactory = new VSCodeStatusBarItemFactory()) {
    // Create status bar item with medium priority (higher number = further to the left)
    this.statusBarItem = this.factory.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)

    // Set the command to run when clicked
    this.statusBarItem.command = COMMAND_CONNECT

    // Show the status bar item
    this.statusBarItem.show()

    // Initialize with disconnected state
    this.updateState(StatusBarState.NotAuthenticated)
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
    this.statusBarItem.dispose()
  }
}
