import * as vscode from "vscode"
import type { YouTrackService } from "../services/youtrack-client"

// Detect test environment - must be in runtime to avoid issues with Jest
const isTestEnvironment = typeof jest !== "undefined" || process.env.NODE_ENV === "test"

// Conditionally import the MockEventEmitter in test environment
// This avoids circular dependencies when running in production
// Define a type for our MockEventEmitter to allow using generics
interface EventEmitterLike<T> {
  event: vscode.Event<T>
  fire(data: T): void
  dispose(): void
}

let MockEventEmitter: new <T>() => EventEmitterLike<T>
if (isTestEnvironment) {
  // Dynamic import to avoid circular dependencies
  const mockModule = require("../test/helpers/vscode-mock")
  MockEventEmitter = mockModule.MockEventEmitter
}

/**
 * Icon configuration for tree items
 */
export interface TreeItemIconPath {
  light: string | vscode.Uri
  dark: string | vscode.Uri
}

/**
 * Base tree item for YouTrack views
 */
export class YouTrackTreeItem extends vscode.TreeItem {
  /**
   * Create a new YouTrack tree item
   * @param label The display label for the tree item
   * @param collapsibleState Whether this item is collapsible
   * @param command Optional command to execute when clicking on the item
   * @param contextValue Optional context value for command enablement
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string,
  ) {
    super(label, collapsibleState)

    if (contextValue) {
      this.contextValue = contextValue
    }
  }

  /**
   * Set a theme icon for this tree item
   * @param iconId Icon ID from the VS Code icon set (e.g., 'plug', 'folder', etc.)
   */
  setThemeIcon(iconId: string): void {
    this.iconPath = new vscode.ThemeIcon(iconId)
  }

  /**
   * Set custom icon paths for this tree item
   * @param lightIconPath Path to icon for light themes
   * @param darkIconPath Path to icon for dark themes
   */
  setCustomIcon(lightIconPath: string | vscode.Uri, darkIconPath: string | vscode.Uri): void {
    this.iconPath = {
      light: lightIconPath instanceof vscode.Uri ? lightIconPath : vscode.Uri.file(lightIconPath),
      dark: darkIconPath instanceof vscode.Uri ? darkIconPath : vscode.Uri.file(darkIconPath),
    }
  }

  /**
   * Create a tree item with a theme icon
   * @param label Display label
   * @param collapsibleState Whether the item is collapsible
   * @param iconId Icon ID from VS Code theme icons
   * @param contextValue Optional context value
   * @param command Optional command
   * @returns Configured YouTrackTreeItem
   */
  static withThemeIcon(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    iconId: string,
    contextValue?: string,
    command?: vscode.Command,
  ): YouTrackTreeItem {
    const item = new YouTrackTreeItem(label, collapsibleState, command, contextValue)
    item.setThemeIcon(iconId)
    return item
  }
}

/**
 * Base tree data provider for YouTrack views
 * Handles the common logic for displaying the setup button when not configured
 */
export abstract class BaseTreeDataProvider implements vscode.TreeDataProvider<YouTrackTreeItem> {
  private _onDidChangeTreeData: EventEmitterLike<YouTrackTreeItem | undefined>
  readonly onDidChangeTreeData: vscode.Event<YouTrackTreeItem | undefined>

  private _isLoading = false

  constructor(protected youtrackService: YouTrackService) {
    // Initialize the appropriate EventEmitter based on environment
    this._onDidChangeTreeData = isTestEnvironment
      ? new MockEventEmitter<YouTrackTreeItem | undefined>()
      : new vscode.EventEmitter<YouTrackTreeItem | undefined>()

    this.onDidChangeTreeData = this._onDidChangeTreeData.event
  }

  set isLoading(isLoading: boolean) {
    this._isLoading = isLoading
    this.refresh()
  }

  get isLoading(): boolean {
    return this._isLoading
  }

  /**
   * Refresh the tree view
   * @param item Optional specific item to refresh, or undefined to refresh everything
   */
  public refresh(item?: YouTrackTreeItem): void {
    this._onDidChangeTreeData.fire(item)
  }

  /**
   * Get tree item for the given element
   */
  public getTreeItem(element: YouTrackTreeItem): vscode.TreeItem {
    return element
  }

  /**
   * Get children for the given element
   * If not configured, return a setup button
   * Otherwise, call the implementation-specific getConfiguredChildren method
   */
  public async getChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    return this.getConfiguredChildren(element)
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
  protected abstract getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]>
}
