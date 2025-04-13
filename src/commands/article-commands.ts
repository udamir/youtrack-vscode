import * as vscode from "vscode"
import { BaseCommandHandler } from "./base-command"
import { COMMAND_OPEN_ARTICLE, COMMAND_PREVIEW_ARTICLE } from "../consts"
import type { YouTrackService } from "../services/youtrack-client"
import type { ArticlesTreeDataProvider } from "../views/articles-tree-view"
import type { MarkdownPreviewProvider } from "../views/markdown-preview"
import * as logger from "../utils/logger"

/**
 * Handler for the Open Article command (legacy HTML view)
 */
export class OpenArticleCommandHandler extends BaseCommandHandler {
  /**
   * Execute the open article command
   */
  async execute(item: { article: any }): Promise<void> {
    try {
      if (!item || !item.article) {
        logger.error("No article provided to open")
        return
      }

      const article = item.article
      logger.info(`Opening article: ${article.title} (${article.id})`)

      // For now, we'll just show a simple webview with the article content
      // Create a webview panel to display the article
      const panel = vscode.window.createWebviewPanel("youtrackArticle", article.title, vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
      })

      // Create article content with HTML
      panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${article.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              padding: 20px;
              line-height: 1.5;
            }
            h1 { 
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            .metadata {
              color: #666;
              margin-bottom: 20px;
              font-size: 0.9em;
            }
            .content {
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${article.title}</h1>
          <div class="metadata">
            <div>Project: ${article.project.name}</div>
            <div>Updated: ${new Date(article.updatedDate).toLocaleString()}</div>
          </div>
          <div class="content">${article.content || "No content available"}</div>
        </body>
        </html>
      `
    } catch (error) {
      this.handleError("Error opening article", error)
    }
  }
}

/**
 * Handler for the Preview Article command (Markdown view)
 */
export class PreviewArticleCommandHandler extends BaseCommandHandler {
  constructor(
    private youtrackService: YouTrackService,
    private markdownPreviewProvider: MarkdownPreviewProvider,
  ) {
    super()
  }

  /**
   * Execute the preview article command
   */
  async execute(articleId: string): Promise<void> {
    try {
      logger.info(`Previewing article with ID: ${articleId}`)
      const article = await this.youtrackService.getArticleById(articleId)

      if (article) {
        await this.markdownPreviewProvider.showPreview(article)
      } else {
        vscode.window.showErrorMessage(`Cannot preview article: Article with ID ${articleId} not found`)
      }
    } catch (error) {
      this.handleError(`Error previewing article ${articleId}`, error)
    }
  }
}

/**
 * Handler for the Refresh Knowledge Base command
 */
export class RefreshKnowledgeBaseCommandHandler extends BaseCommandHandler {
  constructor(private articlesProvider: ArticlesTreeDataProvider) {
    super()
  }

  /**
   * Execute the refresh knowledge base command
   */
  async execute(): Promise<void> {
    try {
      logger.info("Refreshing knowledge base panel")
      this.articlesProvider.refresh()
    } catch (error) {
      this.handleError("Error refreshing knowledge base", error)
    }
  }
}

/**
 * Register all article related commands
 */
export function registerArticleCommands(
  context: vscode.ExtensionContext,
  youtrackService: YouTrackService,
  articlesProvider: ArticlesTreeDataProvider,
  markdownPreviewProvider: MarkdownPreviewProvider,
): void {
  // Open article command (legacy HTML view)
  const openArticleHandler = new OpenArticleCommandHandler()
  const openArticleDisposable = vscode.commands.registerCommand(
    COMMAND_OPEN_ARTICLE,
    openArticleHandler.execute.bind(openArticleHandler),
  )
  context.subscriptions.push(openArticleDisposable)

  // Preview article command (Markdown view)
  const previewArticleHandler = new PreviewArticleCommandHandler(youtrackService, markdownPreviewProvider)
  const previewArticleDisposable = vscode.commands.registerCommand(
    COMMAND_PREVIEW_ARTICLE,
    previewArticleHandler.execute.bind(previewArticleHandler),
  )
  context.subscriptions.push(previewArticleDisposable)

  // Refresh knowledge base command
  const refreshKnowledgeBaseHandler = new RefreshKnowledgeBaseCommandHandler(articlesProvider)
  const refreshKnowledgeBaseDisposable = vscode.commands.registerCommand(
    "youtrack.refreshKnowledgeBase",
    refreshKnowledgeBaseHandler.execute.bind(refreshKnowledgeBaseHandler),
  )
  context.subscriptions.push(refreshKnowledgeBaseDisposable)
}
