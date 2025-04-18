import * as vscode from "vscode"

/**
 * Base tree data provider for YouTrack views
 * Handles the common logic for displaying the setup button when not configured
 */
export abstract class BasePreview<T extends vscode.CustomDocument = vscode.CustomDocument>
  implements vscode.CustomReadonlyEditorProvider<T>
{
  protected subscriptions: vscode.Disposable[] = []

  constructor(
    protected id: string,
    protected context: vscode.ExtensionContext,
  ) {
    this.context.subscriptions.push(vscode.window.registerCustomEditorProvider(this.id, this))
    this.context.subscriptions.push(this)
  }

  abstract openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken,
  ): T | Thenable<T>
  abstract resolveCustomEditor(
    document: T,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Thenable<void> | void

  /**
   * Register a command
   * @param command Command to register
   * @param handler Command handler
   */
  protected registerCommand(command: string, handler: (issueId: string) => Promise<void>): void {
    this.context.subscriptions.push(vscode.commands.registerCommand(command, handler))
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.subscriptions.forEach((d) => d.dispose())
    this.subscriptions = []
  }
}
