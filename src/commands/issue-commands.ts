import * as vscode from "vscode"
import { BaseCommandHandler } from "./base-command"
import {
  COMMAND_FILTER_ISSUES,
  COMMAND_PREVIEW_ISSUE,
  COMMAND_REFRESH_ISSUES,
  COMMAND_TOGGLE_ISSUES_VIEW_MODE,
  ISSUE_VIEW_MODE_LIST,
  ISSUE_VIEW_MODE_TREE,
} from "../consts"
import type { YouTrackService } from "../services/youtrack-client"
import type { IssuesTreeDataProvider } from "../views/issues-tree-view"
import type { MarkdownPreviewProvider } from "../views/markdown-preview"
import * as logger from "../utils/logger"

/**
 * Handler for the Preview Issue command
 */
export class PreviewIssueCommandHandler extends BaseCommandHandler {
  constructor(
    private youtrackService: YouTrackService,
    private markdownPreviewProvider: MarkdownPreviewProvider,
  ) {
    super()
  }

  /**
   * Execute the preview issue command
   */
  async execute(issueId: string): Promise<void> {
    try {
      logger.info(`Previewing issue with ID: ${issueId}`)
      const issue = await this.youtrackService.getIssueById(issueId)

      if (issue) {
        await this.markdownPreviewProvider.showPreview(issue)
      } else {
        vscode.window.showErrorMessage(`Cannot preview issue: Issue with ID ${issueId} not found`)
      }
    } catch (error) {
      this.handleError(`Error previewing issue ${issueId}`, error)
    }
  }
}

/**
 * Handler for the Refresh Issues command
 */
export class RefreshIssuesCommandHandler extends BaseCommandHandler {
  constructor(private issuesProvider: IssuesTreeDataProvider) {
    super()
  }

  /**
   * Execute the refresh issues command
   */
  async execute(): Promise<void> {
    try {
      logger.info("Refreshing issues panel")
      this.issuesProvider.refresh()
    } catch (error) {
      this.handleError("Error refreshing issues", error)
    }
  }
}

/**
 * Handler for the Filter Issues command
 */
export class FilterIssuesCommandHandler extends BaseCommandHandler {
  constructor(private issuesProvider: IssuesTreeDataProvider) {
    super()
  }

  /**
   * Execute the filter issues command
   */
  async execute(): Promise<void> {
    try {
      const currentFilter = this.issuesProvider.filter
      const filterText = await vscode.window.showInputBox({
        title: "Filter Issues",
        prompt: "Enter issue filter text (YouTrack query syntax supported)",
        value: currentFilter,
        placeHolder: "project: {project} #unresolved",
      })

      // Only update if the user didn't cancel and the value changed
      if (filterText !== undefined) {
        logger.info(`Setting issues filter to: ${filterText}`)
        this.issuesProvider.filter = filterText
      }
    } catch (error) {
      this.handleError("Error filtering issues", error)
    }
  }
}

/**
 * Handler for the Toggle Issues View Mode command
 */
export class ToggleIssuesViewModeCommandHandler extends BaseCommandHandler {
  constructor(private issuesProvider: IssuesTreeDataProvider) {
    super()
  }

  /**
   * Execute the toggle issues view mode command
   */
  async execute(): Promise<void> {
    try {
      // Get the current view mode
      const currentMode = this.issuesProvider.viewMode

      // Toggle to the opposite mode
      const newMode = currentMode === ISSUE_VIEW_MODE_LIST ? ISSUE_VIEW_MODE_TREE : ISSUE_VIEW_MODE_LIST

      // Update the view mode (this will trigger a refresh)
      logger.info(`Changing issues view mode from ${currentMode} to: ${newMode}`)
      this.issuesProvider.toggleViewMode()

      // Show a notification with the current mode
      const modeName = newMode === ISSUE_VIEW_MODE_LIST ? "List View" : "Tree View"
      vscode.window.showInformationMessage(`Switched to ${modeName}`)
    } catch (error) {
      this.handleError("Error toggling issues view mode", error)
    }
  }
}

/**
 * Register all issue related commands
 */
export function registerIssueCommands(
  context: vscode.ExtensionContext,
  youtrackService: YouTrackService,
  issuesProvider: IssuesTreeDataProvider,
  markdownPreviewProvider: MarkdownPreviewProvider,
): void {
  // Preview issue command
  const previewIssueHandler = new PreviewIssueCommandHandler(youtrackService, markdownPreviewProvider)
  const previewIssueDisposable = vscode.commands.registerCommand(
    COMMAND_PREVIEW_ISSUE,
    previewIssueHandler.execute.bind(previewIssueHandler),
  )
  context.subscriptions.push(previewIssueDisposable)

  // Refresh issues command
  const refreshIssuesHandler = new RefreshIssuesCommandHandler(issuesProvider)
  const refreshIssuesDisposable = vscode.commands.registerCommand(
    COMMAND_REFRESH_ISSUES,
    refreshIssuesHandler.execute.bind(refreshIssuesHandler),
  )
  context.subscriptions.push(refreshIssuesDisposable)

  // Filter issues command
  const filterIssuesHandler = new FilterIssuesCommandHandler(issuesProvider)
  const filterIssuesDisposable = vscode.commands.registerCommand(
    COMMAND_FILTER_ISSUES,
    filterIssuesHandler.execute.bind(filterIssuesHandler),
  )
  context.subscriptions.push(filterIssuesDisposable)

  // Toggle issues view mode command
  const toggleIssuesViewModeHandler = new ToggleIssuesViewModeCommandHandler(issuesProvider)
  const toggleIssuesViewModeDisposable = vscode.commands.registerCommand(
    COMMAND_TOGGLE_ISSUES_VIEW_MODE,
    toggleIssuesViewModeHandler.execute.bind(toggleIssuesViewModeHandler),
  )
  context.subscriptions.push(toggleIssuesViewModeDisposable)
}
