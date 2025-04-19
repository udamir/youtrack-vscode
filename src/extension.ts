import * as vscode from "vscode"
import { CacheService, ViewService, YouTrackService, ConfigurationService } from "./services"
import {
  ProjectsTreeView,
  ArticlesTreeView,
  RecentArticlesTreeView,
  RecentIssuesTreeView,
  AuthSidebar,
  MarkdownPreview,
  IssuesTreeView,
  StatusBarView,
} from "./views"
import * as logger from "./utils/logger"

// Service instances
const youtrackService = new YouTrackService()
const configService = new ConfigurationService()
let viewService: ViewService

/**
 * This method is called when the extension is activated
 * Activation happens when:
 * - One of the YouTrack views is opened
 * - A YouTrack command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize logger first to ensure all log messages are captured
  logger.initializeLogger(context)

  // Force DEBUG log level temporarily to see all logging during development
  logger.setLogLevel(0) // 0 = DEBUG level
  logger.debug("Debug logging enabled")

  logger.info("Activating YouTrack extension")

  try {
    // Get VS Code configuration
    const connectionUrl = configService.getInstanceUrl()
    logger.info(`YouTrack instance URL from configuration: ${connectionUrl || "not set"}`)

    // Create cache service
    const cacheService = new CacheService(youtrackService, context.workspaceState)

    // Create ViewService first (before other services)
    viewService = new ViewService()

    // Register services for proper disposal
    context.subscriptions.push(viewService)

    // Register tree data providers (creates project and issue tree views)
    new ProjectsTreeView(context, youtrackService, viewService, cacheService)
    new IssuesTreeView(context, youtrackService, viewService, cacheService)
    new ArticlesTreeView(context, youtrackService, viewService)
    new RecentArticlesTreeView(context, youtrackService, cacheService)
    new RecentIssuesTreeView(context, youtrackService, cacheService)
    new MarkdownPreview(context, youtrackService)
    new AuthSidebar(context, youtrackService, viewService, configService)
    new StatusBarView(context, youtrackService)

    // Try to restore connection if configured
    if (!connectionUrl) {
      logger.info("No YouTrack instance URL configured. Showing not-connected view.")
      return viewService.toggleViewsVisibility(false)
    }

    const connected = await youtrackService.initialize(context)
    await viewService.toggleViewsVisibility(connected)

    if (connected) {
      logger.info("Successfully authenticated using stored credentials")
    } else {
      logger.info("Failed to authenticate using stored credentials")
      vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check your connection or re-authenticate.")
    }
  } catch (error) {
    logger.error("Error activating extension:", error)
    vscode.window.showErrorMessage(
      `Error activating YouTrack extension: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  logger.info("Deactivating YouTrack extension")
}
