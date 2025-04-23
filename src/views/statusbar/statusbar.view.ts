import * as vscode from "vscode"
import * as logger from "../../utils/logger"

import { STATUS_AUTHENTICATED, STATUS_ERROR, STATUS_NOT_AUTHENTICATED } from "../../services"
import type { VSCodeService, ConnectionStatus } from "../../services"
import type { YouTrackService } from "../../services/youtrack"
import { COMMAND_CONNECT } from "../auth/auth.consts"
import { Disposable } from "../../utils/disposable"

/**
 * Service for managing the YouTrack status bar item
 */
export class StatusBarView extends Disposable {
  private readonly statusBarItem: vscode.StatusBarItem

  constructor(
    protected readonly context: vscode.ExtensionContext,
    private readonly youtrackService: YouTrackService,
    private readonly vscodeService: VSCodeService,
  ) {
    super()
    // Create status bar item with medium priority (higher number = further to the left)
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this._subscriptions.push(this.statusBarItem)

    // Set the command to run when clicked
    this.statusBarItem.command = COMMAND_CONNECT

    // Show the status bar item
    this.statusBarItem.show()

    // Initialize with disconnected state
    this.updateState(STATUS_NOT_AUTHENTICATED)

    this._subscriptions.push(this.vscodeService.onConnectionStatusChanged(this.handleAuthStateChange.bind(this)))

    // Set initial state based on current connection
    if (this.youtrackService.isConnected()) {
      this.updateState(STATUS_AUTHENTICATED, this.youtrackService.baseUrl)
    }

    this.context.subscriptions.push(this)
  }

  /**
   * Handle authentication state changes from YouTrack service
   */
  private handleAuthStateChange(state: ConnectionStatus): void {
    logger.debug(`Status bar received auth state change: ${state}`)

    switch (state) {
      case STATUS_AUTHENTICATED:
        this.updateState(STATUS_AUTHENTICATED, this.youtrackService?.baseUrl)
        break
      case STATUS_NOT_AUTHENTICATED:
      case STATUS_ERROR:
        this.updateState(state)
        break
    }
  }

  /**
   * Update the status bar state and appearance
   */
  public updateState(state: ConnectionStatus, instanceUrl?: string): void {
    // Update status bar item appearance based on state
    switch (state) {
      case STATUS_AUTHENTICATED:
        this.statusBarItem.text = "$(check) YouTrack"
        this.statusBarItem.tooltip = `Connected to YouTrack: ${instanceUrl}`
        this.statusBarItem.backgroundColor = undefined
        break
      case STATUS_NOT_AUTHENTICATED:
        this.statusBarItem.text = "$(x) YouTrack"
        this.statusBarItem.tooltip = "Not connected to YouTrack - Click to connect"
        this.statusBarItem.backgroundColor = undefined
        break
      case STATUS_ERROR:
        this.statusBarItem.text = "$(alert) YouTrack"
        this.statusBarItem.tooltip = "Error connecting to YouTrack - Click to reconnect"
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")
        break
    }

    logger.info(`Status bar updated: ${state}${instanceUrl ? ` (${instanceUrl})` : ""}`)
  }
}
