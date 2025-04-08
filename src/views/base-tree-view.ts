import * as vscode from "vscode"
import { COMMAND_CONNECT } from "../constants"
import type { YouTrackService } from "../services/youtrack-client"

/**
 * Base tree item for YouTrack views
 */
export class YouTrackTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
  ) {
    super(label, collapsibleState)
  }
}

/**
 * Base tree data provider for YouTrack views
 * Handles the common logic for displaying the setup button when not configured
 */
export abstract class BaseTreeDataProvider implements vscode.TreeDataProvider<YouTrackTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<YouTrackTreeItem | undefined> = new vscode.EventEmitter<
    YouTrackTreeItem | undefined
  >()
  readonly onDidChangeTreeData: vscode.Event<YouTrackTreeItem | undefined> = this._onDidChangeTreeData.event

  constructor(protected youtrackService: YouTrackService) {}

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined)
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
    // If element is defined, we're getting children of a specific node
    if (element) {
      return this.getConfiguredChildren(element)
    }

    // Check if YouTrack is configured
    const isConfigured = this.youtrackService.isConfigured()
    if (!isConfigured) {
      return [this.createSetupButton()]
    }

    // If we're configured, get the implementation-specific children
    return this.getConfiguredChildren()
  }

  /**
   * Create the setup button tree item
   */
  private createSetupButton(): YouTrackTreeItem {
    const setupButton = new YouTrackTreeItem("Setup Connection", vscode.TreeItemCollapsibleState.None, {
      command: COMMAND_CONNECT,
      title: "Connect to YouTrack",
      tooltip: "Configure YouTrack connection",
    })

    setupButton.iconPath = new vscode.ThemeIcon("plug")
    setupButton.tooltip = "Configure YouTrack connection"

    return setupButton
  }

  /**
   * Get children when YouTrack is configured
   * To be implemented by specific tree data providers
   */
  protected abstract getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]>
}
