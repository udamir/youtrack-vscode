import * as vscode from "vscode"
import {
  COMMAND_CONNECT,
  VIEW_ISSUES,
  VIEW_KNOWLEDGE_BASE,
  VIEW_PROJECTS,
  VIEW_RECENT_ARTICLES,
  VIEW_RECENT_ISSUES,
  VIEW_NOT_CONNECTED,
  STATUS_CONNECTED,
} from "./constants/"
import * as logger from "./utils/logger"
import { YouTrackService } from "./services/youtrack-client"
import { ConfigurationService } from "./services/configuration"
import { StatusBarService, StatusBarState } from "./services/status-bar"
import {
  ProjectsTreeDataProvider,
  IssuesTreeDataProvider,
  KnowledgeBaseTreeDataProvider,
  RecentIssuesTreeDataProvider,
  RecentArticlesTreeDataProvider,
  NotConnectedWebviewProvider,
} from "./views"

// Service instances
const youtrackService = new YouTrackService()
const configService = new ConfigurationService()
const statusBarService = new StatusBarService()

// Tree view providers
let projectsProvider: ProjectsTreeDataProvider
let issuesProvider: IssuesTreeDataProvider
let knowledgeBaseProvider: KnowledgeBaseTreeDataProvider
let recentIssuesProvider: RecentIssuesTreeDataProvider
let recentArticlesProvider: RecentArticlesTreeDataProvider

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

    // Register the WebView provider for Not Connected view
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
      VIEW_NOT_CONNECTED,
      new NotConnectedWebviewProvider(context.extensionUri),
    )
    context.subscriptions.push(webviewRegistration)
    logger.info("Registered WebView provider for Not Connected view")

    // Set initial view visibility (default to showing only Projects)
    await toggleViewsVisibility(false)

    // Register tree data providers for views
    registerTreeDataProviders()

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

        // Show all views after successful connection
        await toggleViewsVisibility(true)
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
  // Create tree data providers
  projectsProvider = new ProjectsTreeDataProvider(youtrackService)
  issuesProvider = new IssuesTreeDataProvider(youtrackService)
  knowledgeBaseProvider = new KnowledgeBaseTreeDataProvider(youtrackService)
  recentIssuesProvider = new RecentIssuesTreeDataProvider(youtrackService)
  recentArticlesProvider = new RecentArticlesTreeDataProvider(youtrackService)

  // Register tree data providers
  vscode.window.registerTreeDataProvider(VIEW_PROJECTS, projectsProvider)
  vscode.window.registerTreeDataProvider(VIEW_ISSUES, issuesProvider)
  vscode.window.registerTreeDataProvider(VIEW_KNOWLEDGE_BASE, knowledgeBaseProvider)
  vscode.window.registerTreeDataProvider(VIEW_RECENT_ISSUES, recentIssuesProvider)
  vscode.window.registerTreeDataProvider(VIEW_RECENT_ARTICLES, recentArticlesProvider)

  logger.info("Registered tree data providers for YouTrack views")
}

/**
 * Toggle the visibility of views based on configuration state
 */
async function toggleViewsVisibility(isConfigured: boolean): Promise<void> {
  logger.info(`Setting view visibility. isConfigured: ${isConfigured}`)

  // Always show Projects view
  await vscode.commands.executeCommand("setContext", STATUS_CONNECTED, isConfigured)
  logger.info(`Set ${STATUS_CONNECTED} to ${!isConfigured}`)

  logger.info(`View visibility updated: ${isConfigured ? "All views visible" : "Only Projects view visible"}`)
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

  // Update view visibility based on connection status
  await toggleViewsVisibility(connected)

  logger.info(`Connection status updated: ${connected ? "Connected" : "Disconnected"}`)
}

/**
 * Refresh all YouTrack views
 */
function refreshAllViews(): void {
  projectsProvider.refresh()
  issuesProvider.refresh()
  knowledgeBaseProvider.refresh()
  recentIssuesProvider.refresh()
  recentArticlesProvider.refresh()
  // WebView providers don't need to be refreshed the same way as TreeDataProviders

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
