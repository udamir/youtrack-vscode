import * as vscode from "vscode"
import { YouTrackService } from "./services"
import {
  IssuesTreeView,
  RecentIssuesTreeView,
  ArticlesTreeView,
  RecentArticlesTreeView,
  ProjectsTreeView,
  AuthSidebar,
  StatusBarView,
  MarkdownPreview,
} from "./views"
import * as logger from "./utils/logger"
import { VSCodeService } from "./services/vscode/vscode.service"
import { McpService } from "./services/mcp"

/**
 * This method is called when the extension is activated
 * @param context VS Code extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize logger first to ensure all log messages are captured
  logger.initializeLogger(context)

  // Force DEBUG log level temporarily to see all logging during development
  logger.setLogLevel(0) // 0 = DEBUG level
  logger.debug("Debug logging enabled")

  logger.info("Activating YouTrack extension")

  try {
    // Create ViewService first (before other services)
    const vscodeService = new VSCodeService(context)
    context.subscriptions.push(vscodeService)

    // Get VS Code configuration
    const serverUrl = vscodeService.getServerUrl() ?? ""
    logger.info(`YouTrack server URL from configuration: ${serverUrl || "not set"}`)

    const youtrackService = new YouTrackService()
    context.subscriptions.push(youtrackService)

    // Initialize MCP Service but don't start it yet
    const mcpService = new McpService(youtrackService, vscodeService)
    context.subscriptions.push(mcpService)

    // Register command to start MCP server
    context.subscriptions.push(
      vscode.commands.registerCommand("youtrack.startMcpServer", async () => {
        if (youtrackService.isConnected()) {
          await mcpService.start()
          logger.info(`MCP server started on port ${mcpService.port}`)
          return true
        }
        logger.warn("Cannot start MCP server: YouTrack is not connected")
        return false
      }),
    )

    // Register tree data providers (creates project and issue tree views)
    new ProjectsTreeView(context, youtrackService, vscodeService)
    new IssuesTreeView(context, youtrackService, vscodeService)
    new ArticlesTreeView(context, youtrackService, vscodeService)
    new RecentArticlesTreeView(context, vscodeService)
    new RecentIssuesTreeView(context, vscodeService)
    new MarkdownPreview(context, youtrackService)
    new AuthSidebar(context, youtrackService, vscodeService)
    new StatusBarView(context, youtrackService, vscodeService)

    // Try to restore connection if stored token exists
    const token = (await vscodeService.secureStorage.getToken()) ?? ""
    logger.info(`YouTrack token exists: ${!!token}, YouTrack server URL: ${serverUrl}`)

    // Try to initialize with stored credentials
    logger.info("Trying to connect to YouTrack with stored credentials...")
    const connected = await youtrackService.authenticate(serverUrl, token)
    await vscodeService.toggleViewsVisibility(connected)

    if (connected) {
      logger.info("Successfully authenticated using stored credentials")
      // Start MCP server after successful connection
      await mcpService.start()
      logger.info(`MCP server started on port ${mcpService.port}`)
    } else {
      logger.info("Failed to authenticate using stored credentials")
      // Only show error if we had credentials that failed, don't show on fresh installation
      if (token && serverUrl) {
        vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check your connection or credentials.")
      }
    }
  } catch (error) {
    logger.error(`Extension activation failed: ${error}`)
  }
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  logger.info("Deactivating YouTrack extension")
}
