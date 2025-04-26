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
    const connectionUrl = vscodeService.getInstanceUrl()
    logger.info(`YouTrack instance URL from configuration: ${connectionUrl || "not set"}`)

    const youtrackService = new YouTrackService(vscodeService)
    context.subscriptions.push(youtrackService)

    // MCP Server activation
    const mcpService = new McpService(youtrackService, vscodeService)
    context.subscriptions.push(mcpService)
    await mcpService.start()

    // Register tree data providers (creates project and issue tree views)
    new ProjectsTreeView(context, youtrackService, vscodeService)
    new IssuesTreeView(context, youtrackService, vscodeService)
    new ArticlesTreeView(context, youtrackService, vscodeService)
    new RecentArticlesTreeView(context, youtrackService, vscodeService)
    new RecentIssuesTreeView(context, youtrackService, vscodeService)
    new MarkdownPreview(context, youtrackService)
    new AuthSidebar(context, youtrackService, vscodeService)
    new StatusBarView(context, youtrackService, vscodeService)

    // Try to restore connection if configured
    if (!connectionUrl) {
      logger.info("No YouTrack instance URL configured. Showing not-connected view.")
      return vscodeService.toggleViewsVisibility(false)
    }

    const connected = await youtrackService.initialize()
    await vscodeService.toggleViewsVisibility(connected)

    if (connected) {
      logger.info("Successfully authenticated using stored credentials")
    } else {
      logger.info("Failed to authenticate using stored credentials")
      vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check your connection or re-authenticate.")
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
