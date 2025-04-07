import * as vscode from "vscode"
import { COMMAND_CONNECT } from "./constants"
import * as logger from "./utils/logger"
import { YouTrackService } from "./services/youtrack-client"
import { ConfigurationService } from "./services/configuration"
import { StatusBarService, StatusBarState } from "./services/status-bar"

// Service instances
const youtrackService = new YouTrackService()
const configService = new ConfigurationService()
const statusBarService = new StatusBarService()

/**
 * This method is called when the extension is activated
 * Activation happens when:
 * - One of the YouTrack views is opened
 * - A YouTrack command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize logger
    logger.initializeLogger()
    logger.info("YouTrack integration extension is now active!")

    // Register all commands
    registerCommands(context)

    // Initialize YouTrack client
    const initialized = await youtrackService.initialize(context)
    if (initialized) {
      logger.info("YouTrack client initialized successfully")

      // Update connection status
      await updateConnectionStatus(true)
    } else {
      logger.info("YouTrack client not initialized. User needs to provide credentials.")

      // Update connection status
      await updateConnectionStatus(false)
    }

    // Register tree data providers for views
    registerTreeDataProviders()
  } catch (error) {
    logger.error("Failed to activate extension", error)
    vscode.window.showErrorMessage("Failed to activate YouTrack extension. See output log for details.")
  }
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Register the connect command
  const connectCommand = vscode.commands.registerCommand(COMMAND_CONNECT, async () => {
    try {
      const baseUrl = await vscode.window.showInputBox({
        prompt: "Enter YouTrack instance URL",
        placeHolder: "https://youtrack.example.com",
        value: configService.getInstanceUrl(),
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

      // Try to connect with provided credentials
      const success = await youtrackService.setCredentials(baseUrl, token, context)

      if (success) {
        await configService.setInstanceUrl(baseUrl)
        vscode.window.showInformationMessage("Successfully connected to YouTrack!")
        logger.info(`Connected to YouTrack instance at ${baseUrl}`)

        // Update connection status
        await updateConnectionStatus(true)

        // Refresh views
        refreshAllViews()
      } else {
        vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check credentials and try again.")

        // Update connection status
        await updateConnectionStatus(false)
      }
    } catch (error) {
      logger.error("Error connecting to YouTrack", error)
      vscode.window.showErrorMessage("Error connecting to YouTrack. See output log for details.")
    }
  })

  // Add command to the context subscriptions
  context.subscriptions.push(connectCommand)
}

/**
 * Register tree data providers for YouTrack views
 */
function registerTreeDataProviders(): void {
  // These will be implemented in later tasks
  // Currently just placeholders for the structure
  logger.info("Registered tree data providers for YouTrack views")
}

/**
 * Update extension's connection status
 */
async function updateConnectionStatus(connected: boolean): Promise<void> {
  if (connected) {
    const baseUrl = youtrackService.getBaseUrl()
    statusBarService.updateState(StatusBarState.Authenticated, baseUrl)
  } else {
    statusBarService.updateState(StatusBarState.NotAuthenticated)
  }

  logger.info(`Connection status updated: ${connected ? "Connected" : "Disconnected"}`)
}

/**
 * Refresh all YouTrack views
 */
function refreshAllViews(): void {
  // This will be expanded in later tasks
  // Currently just a placeholder
  logger.info("Refreshing all YouTrack views")
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  // Dispose of the status bar item
  statusBarService.dispose()

  logger.info("YouTrack integration extension is now deactivated.")
}
