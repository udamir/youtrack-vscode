import * as vscode from "vscode"

import { YouTrackTreeItem } from "../base/base.tree-item"
import type { ArticleEntity } from "../articles"

/**
 * Tree item representing a YouTrack knowledge base article in the recent articles view
 */
export class RecentArticleTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly article: ArticleEntity,
    public readonly command?: vscode.Command,
  ) {
    super(article.summary, vscode.TreeItemCollapsibleState.None, command, "youtrack-article")

    // Set description to show the article summary if available
    this.description = article.content || ""

    // Set tooltip
    this.tooltip = `${article.idReadable} ${article.summary}`
  }
}
