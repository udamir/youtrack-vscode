import * as vscode from "vscode"
import * as path from "node:path"
import type { YouTrackService } from "../../services"
import * as logger from "../../utils/logger"
import MarkdownIt from "markdown-it"
import markdownitTaskLists from "markdown-it-task-lists"
import { BasePreview } from "../base"
import {
  COMMAND_OPEN_INTERNAL_LINK,
  COMMAND_PREVIEW_ARTICLE,
  COMMAND_PREVIEW_ISSUE,
  VIEW_MARKDOWN_PREVIEW,
  MAX_TITLE_LENGTH,
} from "./preview.consts"
import { isArticleEntity, isIssueEntity } from "./preview.utils"
import type { PreviewableEntity } from "./preview.types"

/**
 * Provides Markdown preview functionality for YouTrack content
 */
export class MarkdownPreview extends BasePreview {
  private readonly _panels: Map<string, vscode.WebviewPanel> = new Map()
  private readonly _disposables: vscode.Disposable[] = []

  constructor(
    protected readonly context: vscode.ExtensionContext,
    private readonly youtrackService: YouTrackService,
  ) {
    super(VIEW_MARKDOWN_PREVIEW, context)

    // Register commands for handling previews and links
    this.registerCommand(COMMAND_OPEN_INTERNAL_LINK, this.handleInternalLink.bind(this))
    this.registerCommand(COMMAND_PREVIEW_ARTICLE, this.previewArticle.bind(this))
    this.registerCommand(COMMAND_PREVIEW_ISSUE, this.previewIssue.bind(this))
  }

  /**
   * Truncate text to a specified length and add ellipsis if needed
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text) return ""
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  /**
   * Shows a preview of the given YouTrack entity
   */
  public async showPreview(entity: PreviewableEntity): Promise<void> {
    try {
      // Determine the type of entity (issue or article)
      const isIssue = isIssueEntity(entity)
      const isArticle = isArticleEntity(entity)

      if (!isIssue && !isArticle) {
        throw new Error("Unsupported entity type for preview")
      }

      // Create a unique ID for this entity
      const id = entity.idReadable

      // Generate title - limit summary to MAX_TITLE_LENGTH characters
      const truncatedSummary = this.truncateText(entity.summary, MAX_TITLE_LENGTH)
      const title = `${id}: ${truncatedSummary}`

      // Get existing panel or create a new one
      let panel = this._panels.get(id)

      if (!panel) {
        // Create a new panel
        panel = vscode.window.createWebviewPanel(
          `youtrack-${isIssue ? "issue" : "article"}-preview`,
          title,
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableFindWidget: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, "media"))],
          },
        )

        // Store the panel for later use
        this._panels.set(id, panel)

        // Handle panel disposal
        panel.onDidDispose(
          () => {
            this._panels.delete(id)
          },
          null,
          this._disposables,
        )

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
          async (message) => {
            try {
              logger.info(`Received message from webview: ${JSON.stringify(message)}`)

              switch (message.command) {
                case "refresh":
                  // biome-ignore lint/style/noNonNullAssertion: <explanation>
                  await this.refreshContent(entity, panel!)
                  break
                case "openLink":
                  if (message.link) {
                    await this.handleInternalLink(message.link)
                  }
                  break
                default:
                  logger.warn(`Unknown command received from webview: ${message.command}`)
              }
            } catch (error) {
              logger.error("Error handling webview message:", error)
              vscode.window.showErrorMessage(`Error handling message: ${error}`)
            }
          },
          null,
          this._disposables,
        )
      } else {
        // If panel exists, reveal it
        panel.reveal(vscode.ViewColumn.One)
      }

      // Set panel title
      panel.title = title

      // Get the content to display
      const content = await this.getEntityContent(entity)

      // Set webview HTML
      panel.webview.html = this.getWebviewContent(content, entity, panel.webview)
    } catch (error) {
      logger.error("Error showing preview:", error)
      vscode.window.showErrorMessage(`Error showing preview: ${error}`)
    }
  }

  /**
   * Refresh the content of a preview panel
   */
  private async refreshContent(entity: PreviewableEntity, panel: vscode.WebviewPanel): Promise<void> {
    try {
      // Fetch fresh entity data
      let refreshedEntity: PreviewableEntity

      if (isIssueEntity(entity)) {
        refreshedEntity = (await this.youtrackService.getIssueById(entity.id)) || entity
      } else if (isArticleEntity(entity)) {
        refreshedEntity = (await this.youtrackService.getArticleById(entity.id)) || entity
      } else {
        throw new Error("Unknown entity type")
      }

      // Get the refreshed content
      const content = await this.getEntityContent(refreshedEntity)

      // Update the webview
      panel.webview.html = this.getWebviewContent(content, refreshedEntity, panel.webview)
    } catch (error) {
      logger.error("Error refreshing content:", error)
      vscode.window.showErrorMessage(`Error refreshing content: ${error}`)
    }
  }

  /**
   * Get the content to display for an entity
   */
  private async getEntityContent(entity: PreviewableEntity): Promise<string> {
    try {
      if (isIssueEntity(entity)) {
        return entity.description || "*No description provided*"
      }

      if (isArticleEntity(entity)) {
        return entity.content || "*No content provided*"
      }

      return "*Unsupported content type*"
    } catch (error) {
      logger.error("Error getting entity content:", error)
      return "*Error loading content*"
    }
  }

  /**
   * Handle clicks on internal links
   */
  public async handleInternalLink(linkData: string): Promise<void> {
    try {
      logger.info(`Handling internal link: ${linkData}`)
      // Check if it's an issue or article by the ID format
      const [_, issueId, articleId] = linkData.split("-")

      if (issueId === "A" && articleId) {
        // This looks like an article ID
        const article = await this.youtrackService.getArticleById(linkData)
        if (article) {
          // Show the article in a new preview
          await this.showPreview(article)
        } else {
          vscode.window.showWarningMessage(`Article ${linkData} not found`)
        }
      } else {
        // This looks like an issue ID
        const issue = await this.youtrackService.getIssueById(linkData)
        if (issue) {
          // Show the issue in a new preview
          await this.showPreview(issue)
        } else {
          vscode.window.showWarningMessage(`Issue ${linkData} not found`)
        }
      }
    } catch (error) {
      logger.error("Error handling internal link:", error)
      vscode.window.showErrorMessage(`Error handling link: ${error}`)
    }
  }

  /**
   * Generate the HTML content for the webview
   */
  private getWebviewContent(content: string, entity: PreviewableEntity, webview: vscode.Webview): string {
    // Get the CSS URI for styling
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "markdown.css")),
    )

    // Generate metadata for the entity
    const metadata = this.getEntityMetadata(entity)

    // Generate the rendered HTML content
    const renderedContent = this.renderMarkdown(content, entity)

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; script-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline' https:;">
    <title>${
      isIssueEntity(entity)
        ? `${entity.idReadable}: ${this.truncateText(entity.summary, MAX_TITLE_LENGTH)}`
        : `${entity.idReadable}: ${this.truncateText(entity.summary, MAX_TITLE_LENGTH)}`
    }</title>
    <link rel="stylesheet" href="${styleUri}">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.2.3/dist/mermaid.min.js"></script>
</head>
<body class="vscode-body">
    <div class="youtrack-preview">
        <div class="preview-header">
            <div class="entity-info">
                ${metadata}
            </div>
            <div class="actions">
                <button class="refresh-button" id="refresh-button">Refresh</button>
            </div>
        </div>
        <div class="markdown-body">
            ${renderedContent}
        </div>
    </div>
    
    <script>
        // Initialize VS Code API
        const vscode = acquireVsCodeApi();
        
        // Set up the refresh button
        document.getElementById('refresh-button').addEventListener('click', function() {
            vscode.postMessage({
                command: 'refresh'
            });
        });
        
        // Initialize Mermaid diagrams
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                    startOnLoad: true,
                    theme: document.body.classList.contains('vscode-dark') || 
                           document.body.classList.contains('vscode-high-contrast') ? 'dark' : 'default'
                });
            }
        });
    </script>
</body>
</html>`
  }

  /**
   * Render Markdown content with enhanced handling for code blocks and Mermaid diagrams
   */
  private renderMarkdown(content: string, entity: PreviewableEntity): string {
    try {
      // Preprocess content to handle YouTrack-specific markdown extensions
      let processedContent = this.processMermaidDiagrams(content)

      // Process YouTrack's image attributes syntax: ![alt](image.png){width=100px height=200px}
      processedContent = this.processImageAttributes(processedContent, entity)

      // Find and convert issue IDs (like PROJECT-123) to clickable links
      const contentWithLinks = this.convertIssueIdsToLinks(processedContent)

      // Initialize markdown-it with options
      const md = new MarkdownIt({
        html: true, // Enable HTML tags in source
        breaks: true, // Convert '\n' to <br>
        linkify: true, // Auto-convert URLs to links
        typographer: true, // Enable smartquotes and other typographic replacements
      })

      // Enable task lists with enhanced options
      md.use(markdownitTaskLists, {
        enabled: true,
        label: true,
        labelClass: "markdown-task-list-label",
      })

      // Render the markdown
      const html = md.render(contentWithLinks)

      return html
    } catch (error) {
      logger.error("Error rendering markdown:", error)
      return `<div class="error">Error rendering content: ${error}</div>`
    }
  }

  /**
   * Process YouTrack's image attributes syntax: ![alt](image.png){width=100px height=200px}
   * and handle attachments by directly inserting HTML
   */
  private processImageAttributes(content: string, entity: PreviewableEntity): string {
    try {
      // First, log the content to help with debugging
      logger.debug(`Raw content before image processing: ${content.substring(0, 200)}...`)
      logger.debug(`Available attachments: ${JSON.stringify(Object.keys(entity.attachments || {}))}`)

      // Handle regular images with YouTrack attribute syntax
      const imageAttributeRegex = /!\[(.*?)\]\((.*?)\)(?:\{(.*?)\})?/g

      return content.replace(imageAttributeRegex, (_, alt, src, attrs) => {
        logger.debug(`Found image: alt=${alt}, src=${src}, attrs=${attrs || "none"}`)

        // Extract attributes if present
        let width = ""
        let height = ""
        if (attrs) {
          const attrParts = attrs.split(" ")
          width = attrParts.find((attr: string) => attr.startsWith("width="))?.replace("width=", "") || ""
          height = attrParts.find((attr: string) => attr.startsWith("height="))?.replace("height=", "") || ""
        }

        // Try to find a matching attachment by exact name or filename
        let finalSrc = src
        if (entity?.attachments) {
          const fileName = src.split("/").pop() || src

          // Log what we're looking for
          logger.debug(`Looking for attachment match for: ${fileName}`)

          // First try direct match
          if (entity.attachments[src]) {
            finalSrc = entity.attachments[src]
            logger.debug(`Direct match found: ${src} → ${finalSrc}`)
          }
          // Then try filename match
          else {
            const attachmentKey = Object.keys(entity.attachments).find(
              (key) => key.endsWith(fileName) || key === fileName,
            )

            if (attachmentKey) {
              finalSrc = entity.attachments[attachmentKey]
              logger.debug(`Matched by filename: ${fileName} → ${finalSrc}`)
            } else {
              logger.debug(`No attachment match found for: ${fileName}`)
            }
          }

          // Ensure the URL has YouTrack base URL if needed
          if (finalSrc && finalSrc !== src) {
            // If the URL doesn't already start with http/https, add the YouTrack base URL
            if (!finalSrc.startsWith("http://") && !finalSrc.startsWith("https://") && this.youtrackService.baseUrl) {
              // If the URL already starts with a slash, just append to base URL
              if (finalSrc.startsWith("/")) {
                finalSrc = `${this.youtrackService.baseUrl}${finalSrc}`
              } else {
                // Otherwise add a slash between base URL and path
                finalSrc = `${this.youtrackService.baseUrl}/${finalSrc}`
              }
              logger.debug(`Added base URL to attachment: ${finalSrc}`)
            }
          }
        }

        // Generate direct HTML for the image to ensure attributes are handled correctly
        let style = ""
        if (width) style += `width: ${width};`
        if (height) style += `height: ${height};`

        return `<img src="${finalSrc}" alt="${alt}" style="${style}" loading="lazy" />`
      })
    } catch (error) {
      logger.error("Error processing image attributes:", error)
      return content
    }
  }

  /**
   * Convert issue IDs (like PROJECT-123) to clickable links
   */
  private convertIssueIdsToLinks(content: string): string {
    try {
      // Regular expression to find issue IDs like PROJECT-123
      // Ensure we don't match IDs that are already part of a link
      const issueRegex = /(?<!\[|\]\()(?<!\w)([A-Z][A-Z0-9]+-\d+)(?!\w)(?!\]|\))/g

      // Replace issue IDs with clickable links
      return content.replace(issueRegex, (match) => {
        return `[${match}](command:youtrack.openInternalLink?${match})`
      })
    } catch (error) {
      logger.error("Error converting issue IDs to links:", error)
      return content
    }
  }

  /**
   * Process Mermaid diagrams in the content
   */
  private processMermaidDiagrams(content: string): string {
    try {
      // Find and transform Mermaid blocks into special divs that can be processed by Mermaid.js
      return content.replace(/```mermaid([\s\S]*?)```/g, (_, diagram) => {
        // Clean up the diagram content - ensure there are line breaks where needed
        const cleanDiagram = diagram.trim().replace(/\\n/g, "\n").replace(/^\s+/gm, "") // Remove leading whitespace

        return `<div class="mermaid">\n${cleanDiagram}\n</div>`
      })
    } catch (error) {
      logger.error("Error processing Mermaid diagrams:", error)
      return content
    }
  }

  /**
   * Generate metadata HTML for the entity
   */
  private getEntityMetadata(entity: PreviewableEntity): string {
    if (isIssueEntity(entity)) {
      return `
        <div class="metadata-item"><span class="label"></span> ${entity.summary}</div>
        <div class="metadata-item"><span class="label">Status:</span> ${entity.resolved ? "Resolved" : "Open"}</div>
      `
    }

    if (isArticleEntity(entity)) {
      return `
        <div class="metadata-item"><span class="label"></span> ${entity.summary}</div>
        <div class="metadata-item"><span class="label">Last Updated:</span> ${new Date(entity.updated).toLocaleString()}</div>
      `
    }

    return ""
  }

  /**
   * Preview an article by ID
   */
  public async previewArticle(articleId: string): Promise<void> {
    try {
      logger.info(`Opening article preview for ${articleId}`)
      const article = await this.youtrackService.getArticleById(articleId)
      if (article) {
        await this.showPreview(article)
      } else {
        vscode.window.showWarningMessage(`Article ${articleId} not found`)
      }
    } catch (error) {
      logger.error(`Error previewing article ${articleId}:`, error)
      vscode.window.showErrorMessage(`Error previewing article: ${error}`)
    }
  }

  /**
   * Preview an issue by ID
   */
  public async previewIssue(issueId: string): Promise<void> {
    try {
      logger.info(`Opening issue preview for ${issueId}`)
      const issue = await this.youtrackService.getIssueById(issueId)
      if (issue) {
        await this.showPreview(issue)
      } else {
        vscode.window.showWarningMessage(`Issue ${issueId} not found`)
      }
    } catch (error) {
      logger.error(`Error previewing issue ${issueId}:`, error)
      vscode.window.showErrorMessage(`Error previewing issue: ${error}`)
    }
  }

  openCustomDocument(
    // uri: vscode.Uri,
    // openContext: vscode.CustomDocumentOpenContext,
    // token: vscode.CancellationToken,
  ): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    throw new Error("Method not implemented.")
  }
  resolveCustomEditor(
    // document: vscode.CustomDocument,
    // webviewPanel: vscode.WebviewPanel,
    // token: vscode.CancellationToken,
  ): Thenable<void> | void {
    throw new Error("Method not implemented.")
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Dispose of all webview panels
    for (const panel of this._panels.values()) {
      panel.dispose()
    }

    // Dispose of all other disposables
    this._disposables.forEach((d) => d.dispose())
    this._disposables.length = 0
  }
}
