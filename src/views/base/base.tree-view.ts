import * as vscode from "vscode"
import { YouTrackTreeItem } from "./base.tree-item"

/**
 * Base tree data provider for YouTrack views
 * Handles the common logic for displaying the setup button when not configured
 */
export abstract class BaseTreeView<T extends YouTrackTreeItem> implements vscode.TreeDataProvider<T> {
  protected subscriptions: vscode.Disposable[] = []

  private _onDidChangeTreeData: vscode.EventEmitter<T | undefined>
  readonly onDidChangeTreeData: vscode.Event<T | undefined>
  protected treeView: vscode.TreeView<T>

  private _isLoading = false

  constructor(
    protected id: string,
    protected context: vscode.ExtensionContext,
    options: Omit<vscode.TreeViewOptions<T>, "treeDataProvider"> = {},
  ) {
    this._onDidChangeTreeData = new vscode.EventEmitter<T | undefined>()

    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.treeView = vscode.window.createTreeView<T>(this.id, {
      showCollapseAll: true,
      ...options,
      treeDataProvider: this,
    })
    this.subscriptions.push(this._onDidChangeTreeData)
    this.context.subscriptions.push(this.treeView)
    this.context.subscriptions.push(this)
  }

  set isLoading(isLoading: boolean) {
    this._isLoading = isLoading
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  /**
   * Register a command
   * @param command Command to register
   * @param handler Command handler
   */
  protected registerCommand(command: string, handler: (...args: any[]) => Promise<void>): void {
    this.context.subscriptions.push(vscode.commands.registerCommand(command, handler))
  }

  /**
   * Refresh the tree view
   * @param item Optional specific item to refresh, or undefined to refresh everything
   */
  public refresh(item?: T): void {
    this._onDidChangeTreeData.fire(item)
  }

  /**
   * Get tree item for the given element
   */
  public getTreeItem(element: YouTrackTreeItem): vscode.TreeItem {
    return element
  }

  /**
   * Create a text item with description
   * @param label Primary text
   * @param description Secondary text
   * @param contextValue Optional context value for command enablement
   * @returns A configured YouTrackTreeItem
   */
  protected createTextItem(label: string, description?: string, contextValue?: string): YouTrackTreeItem {
    const item = new YouTrackTreeItem(label, vscode.TreeItemCollapsibleState.None, undefined, contextValue)

    if (description) {
      item.description = description
    }

    return item
  }

  /**
   * Create a section header item
   * @param label Header text
   * @returns A styled header item
   */
  protected createHeaderItem(label: string): YouTrackTreeItem {
    const item = this.createTextItem(label)
    item.setThemeIcon("symbol-class")
    return item
  }

  /**
   * Get children when YouTrack is configured
   * To be implemented by specific tree data providers
   */
  public abstract getChildren(element?: T): Promise<T[]>

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.subscriptions.forEach((d) => d.dispose())
    this.subscriptions = []
    this.isLoading = false
  }
}
