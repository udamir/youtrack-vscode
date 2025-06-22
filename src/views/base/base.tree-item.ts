import * as vscode from "vscode"

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
    public readonly collapsibleState = vscode.TreeItemCollapsibleState.None,
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
