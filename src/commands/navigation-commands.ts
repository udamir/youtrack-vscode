import * as vscode from "vscode"
import { BaseCommandHandler } from "./base-command"
import { COMMAND_OPEN_INTERNAL_LINK } from "../consts"
import type { MarkdownPreviewProvider } from "../views/markdown-preview"
import * as logger from "../utils/logger"

/**
 * Handler for the Open Internal Link command
 */
export class OpenInternalLinkCommandHandler extends BaseCommandHandler {
  constructor(private markdownPreviewProvider: MarkdownPreviewProvider) {
    super()
  }

  /**
   * Execute the open internal link command
   */
  async execute(id: string): Promise<void> {
    try {
      logger.info(`Command triggered for internal link: ${id}`)
      // Delegate to the markdown preview provider which already has this logic
      await this.markdownPreviewProvider.handleInternalLink(id)
    } catch (error) {
      this.handleError("Error opening internal link", error)
    }
  }
}

/**
 * Register all navigation related commands
 */
export function registerNavigationCommands(
  context: vscode.ExtensionContext,
  markdownPreviewProvider: MarkdownPreviewProvider,
): void {
  // Open internal link command
  const openInternalLinkHandler = new OpenInternalLinkCommandHandler(markdownPreviewProvider)
  const openInternalLinkDisposable = vscode.commands.registerCommand(
    COMMAND_OPEN_INTERNAL_LINK,
    openInternalLinkHandler.execute.bind(openInternalLinkHandler),
  )
  context.subscriptions.push(openInternalLinkDisposable)
}
