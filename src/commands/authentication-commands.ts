import * as vscode from "vscode"
import { BaseCommandHandler } from "./base-command"
import { COMMAND_CONNECT } from "../consts"
import type { YouTrackService } from "../services/youtrack-client"
import type { ConfigurationService } from "../services/configuration"
import * as logger from "../utils/logger"

/**
 * Command handler for the Connect command
 */
export class ConnectCommandHandler extends BaseCommandHandler {
  constructor(
    private youtrackService: YouTrackService,
    private configService: ConfigurationService,
    private updateConnectionStatus: (connected: boolean) => Promise<void>,
    private refreshAllViews: () => void,
    private toggleViewsVisibility: (visible: boolean) => Promise<void>,
    private context: vscode.ExtensionContext,
  ) {
    super()
  }

  /**
   * Execute the connect command
   */
  async execute(): Promise<void> {
    try {
      const baseUrl = await vscode.window.showInputBox({
        prompt: "Enter YouTrack instance URL",
        placeHolder: "https://youtrack.example.com",
        value: this.configService.getInstanceUrl(),
      })

      if (baseUrl === undefined || baseUrl === "") {
        return // User cancelled
      }

      const token = await vscode.window.showInputBox({
        prompt: "Enter permanent token for YouTrack",
        password: true,
      })

      if (token === undefined || token === "") {
        return // User cancelled
      }

      // Use the extension context passed in through the constructor
      const success = await this.youtrackService.setCredentials(baseUrl, token, this.context)

      if (success) {
        await this.configService.setInstanceUrl(baseUrl)
        vscode.window.showInformationMessage("Successfully connected to YouTrack!")
        logger.info(`Connected to YouTrack instance at ${baseUrl}`)

        // Update connection status
        await this.updateConnectionStatus(true)

        // Refresh views
        this.refreshAllViews()

        // Show all views after successful connection
        await this.toggleViewsVisibility(true)
      } else {
        vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check credentials and try again.")
        logger.error("Failed to connect to YouTrack")

        // Update connection status
        await this.updateConnectionStatus(false)
      }
    } catch (error) {
      this.handleError("Error connecting to YouTrack", error)
      await this.updateConnectionStatus(false)
    }
  }
}

/**
 * Register connect command
 */
export function registerAuthenticationCommands(
  context: vscode.ExtensionContext,
  youtrackService: YouTrackService,
  configService: ConfigurationService,
  updateConnectionStatus: (connected: boolean) => Promise<void>,
  refreshAllViews: () => void,
  toggleViewsVisibility: (visible: boolean) => Promise<void>,
): void {
  // Connect command
  const connectHandler = new ConnectCommandHandler(
    youtrackService,
    configService,
    updateConnectionStatus,
    refreshAllViews,
    toggleViewsVisibility,
    context,
  )
  const connectDisposable = vscode.commands.registerCommand(
    COMMAND_CONNECT,
    connectHandler.execute.bind(connectHandler),
  )
  context.subscriptions.push(connectDisposable)
}
