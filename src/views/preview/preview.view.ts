import * as vscode from "vscode"
import * as path from "node:path"
import { getEntityTypeById, type YouTrackService } from "../../services"
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
import { COMMAND_EDIT_ENTITY } from "../projects"

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

      // Generate a unique ID for this entity
      const entityId = entity.id
      const entityType = isIssue ? "issue" : "article"
      const panelId = `youtrack-${entityType}-${entityId}`

      // Create or reuse an existing webview panel
      let panel = this._panels.get(panelId)

      // Generate a title for the panel
      const title = `${entity.idReadable}: ${this.truncateText(entity.summary, MAX_TITLE_LENGTH)}`

      if (!panel) {
        // Create a new webview panel
        panel = vscode.window.createWebviewPanel(VIEW_MARKDOWN_PREVIEW, title, vscode.ViewColumn.One, {
          enableScripts: true, // Enable JavaScript in the webview
          retainContextWhenHidden: true, // Keep the webview content when hidden
          localResourceRoots: [
            // Allow access to media resources
            vscode.Uri.file(path.join(this.context.extensionPath, "media")),
          ],
        })

        // Store the panel for later use
        this._panels.set(panelId, panel)

        // Handle panel disposal
        panel.onDidDispose(
          () => {
            this._panels.delete(panelId)
          },
          null,
          this._disposables,
        )

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
          async (message) => {
            try {
              logger.debug(`Received message from webview: ${JSON.stringify(message)}`)
              switch (message.command) {
                case "refresh":
                  // biome-ignore lint/style/noNonNullAssertion: <explanation>
                  await this.refreshContent(entity, panel!)
                  break
                case COMMAND_OPEN_INTERNAL_LINK:
                  await this.handleInternalLink(message.args)
                  break
                case "openEditor":
                  await vscode.commands.executeCommand(COMMAND_EDIT_ENTITY, { id: entity.idReadable })
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
      const entityType = getEntityTypeById(linkData)
      const [_, id] = linkData.split("-")

      // Get existing panel map for issue or article
      const existingPanel = this._panels.get(`youtrack-${entityType}-${id}`)

      if (existingPanel) {
        // If we already have a panel for this entity, reveal it instead of creating a new one
        existingPanel.reveal(vscode.ViewColumn.One)
        return
      }

      if (entityType === "article") {
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; script-src ${webview.cspSource} 'unsafe-inline' https:; style-src ${webview.cspSource} 'unsafe-inline' https:;">
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
                <button class="open-editor-button" id="open-editor-button">Open in Editor</button>
            </div>
        </div>
        <div class="markdown-body">
            ${renderedContent}
        </div>
    </div>
    <script>
    // Initialize VS Code API - important to do this only once and store the reference
    const vscode = acquireVsCodeApi();
    
    // Initialize Mermaid diagrams if present
    window.onload = function() {
        if (window.mermaid) {
            mermaid.initialize({ theme: 'forest', securityLevel: 'loose' });
        }
        
        // Then add the handler back
        document.addEventListener('click', handleLinkClick);
        
        const editorBtn = document.getElementById('open-editor-button');
        if (editorBtn) {
            editorBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'openEditor' });
            });
        }
    };
    
    // Separate function to handle link clicks for better maintenance
    function handleLinkClick(event) {
        const element = event.target.closest('a');
        if (element && element.href && element.href.startsWith('command:')) {
            event.preventDefault();
            // Extract the command and argument
            const hrefParts = element.href.substring('command:'.length).trim()
            const [ command, args ] = hrefParts.split('?')

            // Send message to extension
            vscode.postMessage({ command, args })
        }
    }
    
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
        return `[${match}](command:${COMMAND_OPEN_INTERNAL_LINK}?${match})`
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
