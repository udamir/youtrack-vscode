import * as vscode from "vscode"

/**
 * Base WebView provider
 */
export abstract class BaseWebview implements vscode.WebviewViewProvider, vscode.Disposable {
  protected subscriptions: vscode.Disposable[] = []

  constructor(
    protected id: string,
    protected context: vscode.ExtensionContext,
    retainContextWhenHidden = false,
  ) {
    const webview = vscode.window.registerWebviewViewProvider(this.id, this, {
      webviewOptions: { retainContextWhenHidden },
    })
    this.context.subscriptions.push(webview)
    this.context.subscriptions.push(this)
  }

  public dispose() {
    this.subscriptions.forEach((d) => d.dispose())
    this.subscriptions = []
  }

  public abstract resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void>

  protected registerCommand(command: string, handler: (...args: any[]) => Promise<void>): void {
    this.context.subscriptions.push(vscode.commands.registerCommand(command, handler))
  }
}
