import * as vscode from 'vscode';
import { COMMAND_CONNECT } from '../constants';
import type { YouTrackService } from '../services/youtrack-client';

/**
 * Icon configuration for tree items
 */
export interface TreeItemIconPath {
  light: string | vscode.Uri;
  dark: string | vscode.Uri;
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
    super(label, collapsibleState);
    
    if (contextValue) {
      this.contextValue = contextValue;
    }
  }

  /**
   * Set a theme icon for this tree item
   * @param iconId Icon ID from the VS Code icon set (e.g., 'plug', 'folder', etc.)
   */
  setThemeIcon(iconId: string): void {
    this.iconPath = new vscode.ThemeIcon(iconId);
  }

  /**
   * Set custom icon paths for this tree item
   * @param lightIconPath Path to icon for light themes
   * @param darkIconPath Path to icon for dark themes
   */
  setCustomIcon(lightIconPath: string | vscode.Uri, darkIconPath: string | vscode.Uri): void {
    this.iconPath = {
      light: lightIconPath,
      dark: darkIconPath
    };
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
    command?: vscode.Command
  ): YouTrackTreeItem {
    const item = new YouTrackTreeItem(label, collapsibleState, command, contextValue);
    item.setThemeIcon(iconId);
    return item;
  }
}

/**
 * Base tree data provider for YouTrack views
 * Handles the common logic for displaying the setup button when not configured
 */
export abstract class BaseTreeDataProvider implements vscode.TreeDataProvider<YouTrackTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<YouTrackTreeItem | undefined> = new vscode.EventEmitter<
    YouTrackTreeItem | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<YouTrackTreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor(protected youtrackService: YouTrackService) {}

  /**
   * Refresh the tree view
   * @param item Optional specific item to refresh, or undefined to refresh everything
   */
  public refresh(item?: YouTrackTreeItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Get tree item for the given element
   */
  public getTreeItem(element: YouTrackTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for the given element
   * If not configured, return a setup button
   * Otherwise, call the implementation-specific getConfiguredChildren method
   */
  public async getChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // If element is defined, we're getting children of a specific node
    if (element) {
      return this.getConfiguredChildren(element);
    }

    // Check if YouTrack is configured
    const isConfigured = this.youtrackService.isConfigured();
    if (!isConfigured) {
      return [this.createSetupButton()];
    }

    // If we're configured, get the implementation-specific children
    return this.getConfiguredChildren();
  }

  /**
   * Create the setup button tree item
   */
  private createSetupButton(): YouTrackTreeItem {
    return YouTrackTreeItem.withThemeIcon(
      'Setup Connection', 
      vscode.TreeItemCollapsibleState.None,
      'plug',
      'youtrack-setup-button',
      {
        command: COMMAND_CONNECT,
        title: 'Connect to YouTrack',
        tooltip: 'Configure YouTrack connection',
      }
    );
  }

  /**
   * Create a text item with description
   * @param label Primary text
   * @param description Secondary text
   * @param contextValue Optional context value for command enablement
   * @returns A configured YouTrackTreeItem
   */
  protected createTextItem(label: string, description?: string, contextValue?: string): YouTrackTreeItem {
    const item = new YouTrackTreeItem(
      label, 
      vscode.TreeItemCollapsibleState.None, 
      undefined, 
      contextValue
    );
    
    if (description) {
      item.description = description;
    }
    
    return item;
  }

  /**
   * Create a section header item
   * @param label Header text
   * @returns A styled header item
   */
  protected createHeaderItem(label: string): YouTrackTreeItem {
    const item = this.createTextItem(label);
    item.setThemeIcon('symbol-class');
    return item;
  }

  /**
   * Get children when YouTrack is configured
   * To be implemented by specific tree data providers
   */
  protected abstract getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]>;
}
