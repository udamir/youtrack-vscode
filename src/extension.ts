import * as vscode from "vscode"
import { YouTrackService } from "./services/youtrack-client"
import { ProjectsTreeDataProvider } from "./views/projects-tree-view"
import { IssuesTreeDataProvider } from "./views/issues-tree-view"
import { ArticlesTreeDataProvider } from "./views/articles-tree-view"
import { RecentIssuesTreeDataProvider } from "./views/recent-issues-tree-view"
import { RecentArticlesTreeDataProvider } from "./views/recent-articles-tree-view"
import { NotConnectedWebviewProvider } from "./views/not-connected-webview"
import { MarkdownPreviewProvider } from "./views/markdown-preview"
import {
  VIEW_PROJECTS,
  VIEW_ISSUES,
  VIEW_KNOWLEDGE_BASE,
  VIEW_RECENT_ISSUES,
  VIEW_RECENT_ARTICLES,
  VIEW_NOT_CONNECTED,
  STATUS_CONNECTED,
} from "./consts"
import * as logger from "./utils/logger"
import { ConfigurationService } from "./services/configuration"
import { StatusBarService, StatusBarState } from "./services/status-bar"
import { CacheService } from "./services/cache-service"
import {
  registerArticleCommands,
  registerAuthenticationCommands,
  registerIssueCommands,
  registerNavigationCommands,
  registerProjectCommands,
} from "./commands"

// Service instances
const youtrackService = new YouTrackService()
const configService = new ConfigurationService()
const statusBarService = new StatusBarService()

// Tree view providers (will be initialized in registerTreeDataProviders)
let projectsProvider: ProjectsTreeDataProvider
let issuesProvider: IssuesTreeDataProvider
let articlesProvider: ArticlesTreeDataProvider
let recentIssuesProvider: RecentIssuesTreeDataProvider
let recentArticlesProvider: RecentArticlesTreeDataProvider
let markdownPreviewProvider: MarkdownPreviewProvider

/**
 * This method is called when the extension is activated
 * Activation happens when:
 * - One of the YouTrack views is opened
 * - A YouTrack command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info("Activating YouTrack extension")

  try {
    // Get VS Code configuration
    const connectionUrl = configService.getInstanceUrl()
    logger.info(`YouTrack instance URL from configuration: ${connectionUrl || "not set"}`)

    // Create cache service
    const cacheService = new CacheService(youtrackService, context.workspaceState)

    // Register tree data providers (creates project and issue tree views)
    registerTreeDataProviders(context, cacheService)

    // Try to restore connection if configured
    if (connectionUrl) {
      const connected = await youtrackService.initialize(context)
      await updateConnectionStatus(connected)

      if (connected) {
        logger.info("Successfully authenticated using stored credentials")

        // Show all views after successful connection
        await toggleViewsVisibility(true)
      } else {
        logger.info("Failed to authenticate using stored credentials")
        vscode.window.showErrorMessage(
          "Failed to connect to YouTrack. Please check your connection or re-authenticate.",
        )

        // Show limited views when disconnected
        await toggleViewsVisibility(false)
      }
    } else {
      logger.info("No YouTrack instance URL configured. Showing not-connected view.")
      await updateConnectionStatus(false)
      await toggleViewsVisibility(false)
    }

    // Register all commands
    registerAuthenticationCommands(
      context,
      youtrackService,
      configService,
      updateConnectionStatus,
      refreshAllViews,
      toggleViewsVisibility,
    )
    registerProjectCommands(context, youtrackService, projectsProvider)
    registerIssueCommands(context, youtrackService, issuesProvider, markdownPreviewProvider)
    registerArticleCommands(context, youtrackService, articlesProvider, markdownPreviewProvider)
    registerNavigationCommands(context, markdownPreviewProvider)

    // Update status bar when server connection changes
    youtrackService.onServerChanged((baseUrl: string | undefined) => {
      if (baseUrl) {
        statusBarService.updateState(StatusBarState.Authenticated, baseUrl)
      } else {
        statusBarService.updateState(StatusBarState.NotAuthenticated)
      }
    })

    logger.info("YouTrack extension activated")
  } catch (error) {
    logger.error("Error activating extension", error)
    vscode.window.showErrorMessage(`Error activating YouTrack extension: ${error}`)
  }
}

/**
 * Register tree data providers and their tree views
 */
function registerTreeDataProviders(context: vscode.ExtensionContext, cacheService: CacheService): void {
  logger.info("Registering tree data providers")

  // Create "not connected" webview provider
  const notConnectedProvider = new NotConnectedWebviewProvider(context.extensionUri)
  const notConnectedView = vscode.window.registerWebviewViewProvider(VIEW_NOT_CONNECTED, notConnectedProvider)
  context.subscriptions.push(notConnectedView)

  // Create markdown preview provider
  markdownPreviewProvider = new MarkdownPreviewProvider(youtrackService)
  context.subscriptions.push(markdownPreviewProvider)

  // Create projects tree provider
  projectsProvider = new ProjectsTreeDataProvider(youtrackService, cacheService)
  const projectsView = vscode.window.createTreeView(VIEW_PROJECTS, {
    treeDataProvider: projectsProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(projectsView)

  // Create issues tree provider
  issuesProvider = new IssuesTreeDataProvider(youtrackService, cacheService, projectsProvider)
  const issuesView = vscode.window.createTreeView(VIEW_ISSUES, {
    treeDataProvider: issuesProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(issuesView)

  // Create knowledge base tree provider
  articlesProvider = new ArticlesTreeDataProvider(youtrackService, projectsProvider)
  const knowledgeBaseView = vscode.window.createTreeView(VIEW_KNOWLEDGE_BASE, {
    treeDataProvider: articlesProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(knowledgeBaseView)

  // Create recent issues tree provider
  recentIssuesProvider = new RecentIssuesTreeDataProvider(youtrackService, cacheService)
  const recentIssuesView = vscode.window.createTreeView(VIEW_RECENT_ISSUES, {
    treeDataProvider: recentIssuesProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(recentIssuesView)

  // Create recent articles tree provider
  recentArticlesProvider = new RecentArticlesTreeDataProvider(youtrackService, cacheService)
  const recentArticlesView = vscode.window.createTreeView(VIEW_RECENT_ARTICLES, {
    treeDataProvider: recentArticlesProvider,
    showCollapseAll: false,
  })
  context.subscriptions.push(recentArticlesView)

  // Update issues when active project changes
  projectsProvider.onDidChangeActiveProject(() => {
    logger.info("Active project changed, refreshing issues and knowledge base")
    issuesProvider.refresh()
    articlesProvider.refresh()
  })
}

/**
 * Toggle the visibility of views based on configuration state
 */
async function toggleViewsVisibility(isConfigured: boolean): Promise<void> {
  logger.info(`Toggling views visibility. isConfigured=${isConfigured}`)

  // Update context to control view visibility based on connection status
  await vscode.commands.executeCommand("setContext", STATUS_CONNECTED, isConfigured)

  if (isConfigured) {
    // If configured, refresh everything to make sure the latest data is shown
    refreshAllViews()
  }
}

/**
 * Update extension's connection status
 */
async function updateConnectionStatus(connected: boolean): Promise<void> {
  logger.info(`Updating connection status: ${connected ? "connected" : "disconnected"}`)

  // Update the status based on authentication status
  if (connected) {
    statusBarService.updateState(StatusBarState.Authenticated, youtrackService.baseUrl)
  } else {
    statusBarService.updateState(StatusBarState.NotAuthenticated)
  }

  // Set the context value to control UI components
  await vscode.commands.executeCommand("setContext", STATUS_CONNECTED, connected)
}

/**
 * Refresh all YouTrack views
 */
function refreshAllViews(): void {
  logger.info("Refreshing all views")
  projectsProvider.refresh()
  issuesProvider.refresh()
  articlesProvider.refresh()
  recentIssuesProvider.refresh()
  recentArticlesProvider.refresh()
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  logger.info("YouTrack extension deactivated")
  statusBarService.dispose()
}
