import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import * as logger from "../utils/logger"

/**
 * Tree data provider for YouTrack Projects view
 */
export class ProjectsTreeDataProvider extends BaseTreeDataProvider {
  /**
   * Get children for the Projects view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // This will be implemented in a future task to show actual projects
    // For now, just return a placeholder item
    logger.info("Getting projects view children - not fully implemented yet")

    if (element) {
      return []
    }

    const placeholder = new YouTrackTreeItem("Projects will be shown here", vscode.TreeItemCollapsibleState.None)
    placeholder.description = "Coming Soon"

    return [placeholder]
  }
}
