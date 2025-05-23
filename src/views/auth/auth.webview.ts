import * as vscode from "vscode"

import type { VSCodeService, YouTrackService } from "../../services"
import { COMMAND_CONNECT, VIEW_NOT_CONNECTED } from "./auth.consts"
import { BaseWebview } from "../base/base.webview"
import * as logger from "../../utils/logger"

/**
 * WebView provider for the Not Configured panel
 * Shows instructions and a blue "Setup Connection" button with proper styling
 */
export class AuthSidebar extends BaseWebview {
  constructor(
    context: vscode.ExtensionContext,
    protected youtrackService: YouTrackService,
    protected vscodeService: VSCodeService,
  ) {
    super(VIEW_NOT_CONNECTED, context)

    // Register the connect command at the time of construction
    this.registerCommand(COMMAND_CONNECT, this.connectCommandHandler.bind(this))
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    // Allow scripts in the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    }

    // Set the HTML content
    webviewView.webview.html = this.getWebviewContent()

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "connect":
            // Execute the connect command
            vscode.commands.executeCommand(COMMAND_CONNECT)
            return
        }
      },
      undefined,
      [],
    )
  }

  async connectCommandHandler(): Promise<void> {
    try {
      const baseUrl = await vscode.window.showInputBox({
        prompt: "Enter YouTrack instance URL",
        placeHolder: "https://youtrack.example.com",
        value: this.vscodeService.getInstanceUrl(),
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

      // Connect to YouTrack and update the state
      const success = await this.youtrackService.setCredentials(baseUrl, token)

      if (success) {
        await this.vscodeService.setInstanceUrl(baseUrl)
        vscode.window.showInformationMessage("Successfully connected to YouTrack!")
        logger.info(`Connected to YouTrack instance at ${baseUrl}`)

        // Refresh views
        this.vscodeService.refreshViews()

        // Show all views after successful connection
        await this.vscodeService.toggleViewsVisibility(true)
      } else {
        vscode.window.showErrorMessage("Failed to connect to YouTrack. Please check credentials and try again.")
        logger.error("Failed to connect to YouTrack")

        // Show limited views when disconnected
        await this.vscodeService.toggleViewsVisibility(false)
      }
    } catch (error) {
      logger.error("Error connecting to YouTrack", error)
      await this.vscodeService.toggleViewsVisibility(false)
    }
  }

  /**
   * Generate the HTML content for the webview
   */
  private getWebviewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YouTrack Configuration</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-panel-background);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }
            h2 {
                color: var(--vscode-descriptionForeground);
            }
            .instructions {
                text-align: left;
                width: 100%;
            }
            .connect-button {
                background-color: #0078D7;
                border: none;
                color: white;
                padding: 10px 10px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 14px;
                margin: 20px 0;
                cursor: pointer;
                border-radius: 4px;
                transition: background-color 0.3s;
            }
            .connect-button:hover {
                background-color: #005A9E;
            }
            .icon {
                margin-right: 6px;
            }
            .instruction-step {
                margin-bottom: 8px;
            }
            .note {
                font-style: italic;
                margin-top: 8px;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="instructions">
                <h3>YouTrack is not connected</h3>
            </div>
                
            <button class="connect-button" id="connectButton">
                Setup Connection
            </button>

            <div class="instructions">
                <h3>To connect to YouTrack, you need:</h3>
                <div class="instruction-step"> 1. Your YouTrack instance URL</div>
                <div class="instruction-step"> 2. A permanent token</div>
                
                <h3>To get a permanent token:</h3>
                <div class="instruction-step"> - Go to your YouTrack profile</div>
                <div class="instruction-step"> - Select 'Authentication' tab</div>
                <div class="instruction-step"> - Click 'New Token'</div>
                <div class="instruction-step"> - Enter name and click 'Create'</div>
                
                <div class="note">
                    The token will be stored securely in your system's keychain.
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('connectButton').addEventListener('click', () => {
                vscode.postMessage({
                    command: 'connect'
                });
            });
        </script>
    </body>
    </html>`
  }
}
