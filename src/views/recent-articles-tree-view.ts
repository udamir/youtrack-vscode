import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import * as logger from "../utils/logger"

/**
 * Tree data provider for YouTrack Recent Articles view
 */
export class RecentArticlesTreeDataProvider extends BaseTreeDataProvider {
  /**
   * Get children for the Recent Articles view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // This will be implemented in a future task to show actual recent articles
    // For now, just return a placeholder item
    logger.info("Getting recent articles view children - not fully implemented yet")

    if (element) {
      return []
    }

    const placeholder = new YouTrackTreeItem("Recent articles will be shown here", vscode.TreeItemCollapsibleState.None)
    placeholder.description = "Coming Soon"

    return [placeholder]
  }
}
