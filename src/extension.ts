import * as vscode from "vscode"
import * as logger from "./utils/logger"
import { YouTrackService } from "./services/youtrack-client"
import { ConfigurationService } from "./services/configuration"
import { StatusBarService, StatusBarState } from "./services/status-bar"
import { CacheService } from "./services/cache-service"
import { ProjectsTreeDataProvider } from "./views/projects-tree-view"
import { IssuesTreeDataProvider } from "./views/issues-tree-view"
import { KnowledgeBaseTreeDataProvider } from "./views/knowledge-base-tree-view"
import { RecentIssuesTreeDataProvider } from "./views/recent-issues-tree-view"
import { RecentArticlesTreeDataProvider } from "./views/recent-articles-tree-view"
import { NotConnectedWebviewProvider } from "./views/not-connected-webview"
import {
  COMMAND_CONNECT,
  COMMAND_ADD_PROJECT,
  COMMAND_REMOVE_PROJECT,
  COMMAND_SET_ACTIVE_PROJECT,
  VIEW_PROJECTS,
  VIEW_ISSUES,
  VIEW_RECENT_ISSUES,
  VIEW_KNOWLEDGE_BASE,
  VIEW_RECENT_ARTICLES,
  VIEW_NOT_CONNECTED,
  STATUS_CONNECTED,
} from "./consts"

// Service instances
const youtrackService = new YouTrackService()
const configService = new ConfigurationService()
const statusBarService = new StatusBarService()

// Tree view providers (will be initialized in registerTreeDataProviders)
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

    // Initialize YouTrack client
    const initialized = await youtrackService.initialize(context)
    logger.info(
      initialized
        ? "YouTrack client initialized successfully"
        : "YouTrack client not initialized. User needs to provide credentials.",
    )

    // Set initial view visibility (default to showing only Projects)
    await toggleViewsVisibility(false)

    // Register tree data providers for views
    registerTreeDataProviders(context)

    // Register all commands
    registerCommands(context)

    // Update connection status
    await updateConnectionStatus(initialized)
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

  // Register add project command
  const addProjectCommand = vscode.commands.registerCommand(COMMAND_ADD_PROJECT, async () => {
    try {
      // Get all available projects from YouTrack
      const availableProjects = await youtrackService.getProjects()

      if (!availableProjects || availableProjects.length === 0) {
        vscode.window.showInformationMessage(
          "No projects available in YouTrack or you don't have access to any projects",
        )
        return
      }

      // Filter out already selected projects
      const unselectedProjects = availableProjects.filter(
        (project) => !projectsProvider.selectedProjects.some((selected) => selected.id === project.id),
      )

      if (unselectedProjects.length === 0) {
        vscode.window.showInformationMessage("All available projects have already been added")
        return
      }

      // Show project picker and let user select one to add
      const selected = await vscode.window.showQuickPick(
        unselectedProjects.map((p) => ({
          label: p.name,
          description: p.shortName,
          detail: p.description,
          project: p,
        })),
      )

      if (selected) {
        // Add the selected project
        projectsProvider.addProject(selected.project)
      }
    } catch (error) {
      logger.error("Error adding project", error)
      vscode.window.showErrorMessage("Error adding project. See output log for details.")
    }
  })

  // Register remove project command
  const removeProjectCommand = vscode.commands.registerCommand(COMMAND_REMOVE_PROJECT, async (item: any) => {
    try {
      if (item?.project) {
        const projectId = item.project.id
        const projectName = item.project.name

        // Confirm deletion
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to remove project "${projectName}"?`,
          { modal: true },
          "Yes",
        )

        if (confirm === "Yes") {
          projectsProvider.removeProject(projectId)
          vscode.window.showInformationMessage(`Removed project: ${projectName}`)
        }
      }
    } catch (error) {
      logger.error("Error removing project", error)
      vscode.window.showErrorMessage("Error removing project. See output log for details.")
    }
  })

  // Register set active project command
  const setActiveProjectCommand = vscode.commands.registerCommand(COMMAND_SET_ACTIVE_PROJECT, async (item: any) => {
    try {
      // Check if we have a valid item with project info
      if (!item) {
        logger.error("Error setting active project: No item received")
        return
      }

      // Extract project information based on the shape of the item
      let projectShortName: string | undefined
      let projectName: string | undefined

      if (item.project && typeof item.project === "object") {
        // Case: item is { project: Project }
        projectShortName = item.project.shortName
        projectName = item.project.name
      } else if (item.shortName && item.name) {
        // Case: item is directly a Project or ProjectTreeItem
        projectShortName = item.shortName
        projectName = item.name
      }

      if (projectShortName && projectName) {
        projectsProvider.setActiveProject(projectShortName)
        // Add debug logging to track command execution
        logger.info(`Active project set to: ${projectName} (${projectShortName})`)
      } else {
        logger.error("Error setting active project: Invalid project object received", item)
      }
    } catch (error) {
      logger.error("Error setting active project", error)
      vscode.window.showErrorMessage("Error setting active project. See output log for details.")
    }
  })

  // Add commands to subscriptions
  context.subscriptions.push(connectCommand)
  context.subscriptions.push(addProjectCommand)
  context.subscriptions.push(removeProjectCommand)
  context.subscriptions.push(setActiveProjectCommand)
}

/**
 * Register tree data providers and their tree views
 */
function registerTreeDataProviders(context: vscode.ExtensionContext): void {
  // Create tree data providers
  const cacheService = new CacheService(youtrackService, context.workspaceState)

  projectsProvider = new ProjectsTreeDataProvider(youtrackService, cacheService)
  issuesProvider = new IssuesTreeDataProvider(youtrackService, cacheService, projectsProvider)
  knowledgeBaseProvider = new KnowledgeBaseTreeDataProvider(youtrackService)
  recentIssuesProvider = new RecentIssuesTreeDataProvider(youtrackService, cacheService)
  recentArticlesProvider = new RecentArticlesTreeDataProvider(youtrackService, cacheService)

  // Register the WebView provider for Not Connected view
  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    VIEW_NOT_CONNECTED,
    new NotConnectedWebviewProvider(context.extensionUri),
  )
  context.subscriptions.push(webviewRegistration)
  logger.info("Registered WebView provider for Not Connected view")

  // Register tree data providers
  vscode.window.registerTreeDataProvider(VIEW_PROJECTS, projectsProvider)

  // Register Issues view as TreeView instead of just a data provider
  const issuesView = vscode.window.createTreeView(VIEW_ISSUES, {
    treeDataProvider: issuesProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(issuesView)

  // Register Articles view as TreeView instead of just a data provider
  const articlesView = vscode.window.createTreeView(VIEW_KNOWLEDGE_BASE, {
    treeDataProvider: knowledgeBaseProvider,
    showCollapseAll: true,
  })
  context.subscriptions.push(articlesView)

  vscode.window.registerTreeDataProvider(VIEW_RECENT_ISSUES, recentIssuesProvider)
  vscode.window.registerTreeDataProvider(VIEW_RECENT_ARTICLES, recentArticlesProvider)

  // Subscribe to active project changes to update the Issues view title
  projectsProvider.onDidChangeActiveProject((event) => {
    if (event.project) {
      // Update Issues view title to include active project
      issuesView.title = `${event.project.shortName}: Issues`
      articlesView.title = `${event.project.shortName}: Knowledge Base`
      logger.info(`Updated Issues/Articles view title with ${event.project.shortName}`)
    } else {
      // Reset to default title if no active project
      issuesView.title = "Issues"
      articlesView.title = "Knowledge Base"
      logger.info("Reset Issues/Articles view title to default")
    }
  })

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

// Update status bar based on server connection status
youtrackService.onServerChanged((baseUrl: string | undefined) => {
  if (baseUrl) {
    statusBarService.updateState(StatusBarState.Authenticated, baseUrl)
  } else {
    statusBarService.updateState(StatusBarState.NotAuthenticated)
  }
})

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  // Dispose of the status bar item
  statusBarService.dispose()

  logger.info("YouTrack integration extension is now deactivated.")
}
