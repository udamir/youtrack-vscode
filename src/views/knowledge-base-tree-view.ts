import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import * as logger from "../utils/logger"

/**
 * Tree data provider for YouTrack Knowledge Base view
 */
export class KnowledgeBaseTreeDataProvider extends BaseTreeDataProvider {
  /**
   * Get children for the Knowledge Base view when configured
   */
  protected async getConfiguredChildren(element?: YouTrackTreeItem): Promise<YouTrackTreeItem[]> {
    // This will be implemented in a future task to show actual articles
    // For now, just return a placeholder item
    logger.info("Getting knowledge base view children - not fully implemented yet")

    if (element) {
      return []
    }

    const placeholder = new YouTrackTreeItem(
      "Knowledge Base articles will be shown here",
      vscode.TreeItemCollapsibleState.None,
    )
    placeholder.description = "Coming Soon"

    return [placeholder]
  }
}
