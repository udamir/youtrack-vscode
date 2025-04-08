import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import * as logger from "../utils/logger"

/**
 * Tree data provider for YouTrack Recent Issues view
 */
export class RecentIssuesTreeDataProvider extends BaseTreeDataProvider {
  /**
   * Get children for the Recent Issues view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // This will be implemented in a future task to show actual recent issues
    // For now, just return a placeholder item
    logger.info("Getting recent issues view children - not fully implemented yet")

    if (element) {
      return []
    }

    const placeholder = new YouTrackTreeItem("Recent issues will be shown here", vscode.TreeItemCollapsibleState.None)
    placeholder.description = "Coming Soon"

    return [placeholder]
  }
}
