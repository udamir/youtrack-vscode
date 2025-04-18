import * as vscode from "vscode"
import { YouTrackTreeItem } from "./base.tree-item"

/**
 * Types of tree view layouts
 */
export enum TreeViewLayout {
  /**
   * Items displayed in a flat list
   */
  List = 0,

  /**
   * Items displayed in a hierarchical tree
   */
  Tree = 1,
}

/**
 * Tree item sorting options
 */
export enum TreeItemSorting {
  /**
   * Sort alphabetically by label
   */
  Alphabetical = 0,

  /**
   * Sort by date, newest first
   */
  DateDesc = 1,

  /**
   * Sort by date, oldest first
   */
  DateAsc = 2,

  /**
   * Use natural ordering (as returned by API)
   */
  Natural = 3,
}

/**
 * Helper for registering a view
 * @param viewId The ID of the view to register
 * @param treeDataProvider The tree data provider for the view
 * @returns The registered tree view
 */
export function registerTreeView(
  viewId: string,
  treeDataProvider: vscode.TreeDataProvider<YouTrackTreeItem>,
): vscode.TreeView<YouTrackTreeItem> {
  return vscode.window.createTreeView(viewId, {
    treeDataProvider,
    showCollapseAll: true,
  })
}

/**
 * Sort tree items by label alphabetically
 * @param items Array of tree items to sort
 * @returns Sorted array of tree items
 */
export function sortTreeItemsAlphabetically(items: YouTrackTreeItem[]): YouTrackTreeItem[] {
  return [...items].sort((a, b) => {
    return a.label.localeCompare(b.label)
  })
}

export function createBasicItem(label: string, description?: string, tooltip?: string): YouTrackTreeItem {
  const item = new YouTrackTreeItem(label, vscode.TreeItemCollapsibleState.None)
  item.tooltip = tooltip
  item.description = description
  return item
}

/**
 * Create a loading tree item
 * @returns A tree item showing loading status
 */
export function createLoadingItem(message = "Loading..."): YouTrackTreeItem {
  const item = new YouTrackTreeItem(message, vscode.TreeItemCollapsibleState.None)
  item.setThemeIcon("loading~spin")
  return item
}

/**
 * Create an "empty" tree item
 * @param message Message to display
 * @returns An informational tree item
 */
export function createEmptyItem(message = "No items found"): YouTrackTreeItem {
  const item = new YouTrackTreeItem(message, vscode.TreeItemCollapsibleState.None)
  item.setThemeIcon("info")
  return item
}

/**
 * Create an error tree item
 * @param errorMessage Error message to display
 * @returns An error tree item
 */
export function createErrorItem(errorMessage: string): YouTrackTreeItem {
  const item = new YouTrackTreeItem(`Error: ${errorMessage}`, vscode.TreeItemCollapsibleState.None)
  item.setThemeIcon("error")
  return item
}

/**
 * Add tooltip to a tree item if not already set
 * @param item Tree item to modify
 * @param tooltip Tooltip text
 */
export function addTooltip(item: YouTrackTreeItem, tooltip: string): void {
  if (!item.tooltip) {
    item.tooltip = tooltip
  }
}

/**
 * Shows notification when tree view refresh fails
 * @param viewName Name of the view (for display)
 * @param error Error that occurred
 */
export function handleTreeViewRefreshError(viewName: string, error: Error): void {
  const errorMessage = `Failed to refresh ${viewName}: ${error.message}`
  vscode.window.showErrorMessage(errorMessage)
  console.error(errorMessage, error)
}
