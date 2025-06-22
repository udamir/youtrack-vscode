import * as vscode from "vscode"

import { STATUS_AUTHENTICATED } from "../../services"
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
            // If serverUrl is provided from the webview, pass it to the handler
            if (message.serverUrl) {
              this.connectCommandHandler(message.serverUrl)
            } else {
              // Execute the connect command
              vscode.commands.executeCommand(COMMAND_CONNECT)
            }
            return
        }
      },
      undefined,
      [],
    )
  }

  async connectCommandHandler(serverUrl?: string): Promise<void> {
    try {
      // If serverUrl is provided from the webview, use it, otherwise show input box
      let baseUrl = serverUrl
      if (!baseUrl) {
        baseUrl = await vscode.window.showInputBox({
          prompt: "Enter YouTrack server URL",
          placeHolder: "https://youtrack.example.com",
          value: this.vscodeService.getServerUrl(),
        })
      }

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
      const success = await this.youtrackService.authenticate(baseUrl, token)

      if (success) {
        await this.vscodeService.setServerUrl(baseUrl)
        // Update connection status to ensure status bar is updated
        this.vscodeService.changeConnectionStatus(STATUS_AUTHENTICATED, baseUrl)
        vscode.window.showInformationMessage("Successfully connected to YouTrack!")
        logger.info(`Connected to YouTrack server at ${baseUrl}`)

        // Start MCP server after successful connection
        // Find the MCP service and start it
        try {
          // Use command to start MCP server (this avoids direct dependency on McpService)
          await vscode.commands.executeCommand("youtrack.startMcpServer")
          logger.info("MCP server started after successful connection")
        } catch (mcpError) {
          logger.error("Failed to start MCP server:", mcpError)
        }

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
    // Get the previous URL if available
    const previousUrl = this.vscodeService.getServerUrl() || ""

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
                padding: 10px 20px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 14px;
                margin: 10px 0 20px 0;
                cursor: pointer;
                border-radius: 4px;
                transition: background-color 0.3s;
                width: 100%;
            }
            .connect-button:hover:not(:disabled) {
                background-color: #005A9E;
            }
            .connect-button:disabled {
                background-color: #cccccc;
                color: #666666;
                cursor: not-allowed;
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
            .input-group {
                display: flex;
                flex-direction: column;
                margin-bottom: 5px;
                width: 100%;
                box-sizing: border-box;
            }
            .input-group input {
                padding: 8px;
                margin-top: 5px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 2px;
                outline: none;
                width: 100%;
                box-sizing: border-box;
                height: 36px;
            }
            .input-group input:focus {
                border-color: var(--vscode-focusBorder);
            }
            .input-label {
                text-align: left;
                margin-bottom: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="instructions">
                <h3>YouTrack is not connected</h3>
            </div>
            
            <div class="input-group">
                <div class="input-label">YouTrack server URL:</div>
                <input type="text" id="serverUrlInput" placeholder="https://youtrack.example.com" value="${previousUrl}" />
            </div>
                
            <button class="connect-button" id="connectButton" disabled>
                Connect
            </button>

            <div class="instructions">
                <h3>To connect to YouTrack, you need:</h3>
                <div class="instruction-step"> 1. Your YouTrack server URL</div>
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
            const serverUrlInput = document.getElementById('serverUrlInput');
            const connectButton = document.getElementById('connectButton');
            
            // Initial button state based on input value
            connectButton.disabled = serverUrlInput.value.trim() === '';
            
            // Update button state when input changes
            serverUrlInput.addEventListener('input', () => {
                connectButton.disabled = serverUrlInput.value.trim() === '';
            });
            
            connectButton.addEventListener('click', () => {
                const serverUrl = serverUrlInput.value;
                vscode.postMessage({
                    command: 'connect',
                    serverUrl: serverUrl
                });
            });
        </script>
    </body>
    </html>`
  }
}
