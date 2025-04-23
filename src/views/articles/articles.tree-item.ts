import * as vscode from "vscode"
import { YouTrackTreeItem } from "../base"
import type { ArticleBaseEntity } from "./articles.types"
import { COMMAND_PREVIEW_ARTICLE } from "../preview"

/**
 * Tree item representing a YouTrack knowledge base article
 */
export class ArticleTreeItem extends YouTrackTreeItem {
  constructor(public readonly article: ArticleBaseEntity) {
    super(
      article.summary,
      // Set collapsible state based on whether the article has children
      article.childArticles.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      {
        command: COMMAND_PREVIEW_ARTICLE,
        title: "Preview Article",
        arguments: [article.idReadable],
      },
      "youtrack-article",
    )

    // Set the id property to match the article id for tracking
    this.id = article.idReadable

    // Set tooltip to include additional info
    this.tooltip = article.summary

    // Set description showing the folder path if available
    if (article.childArticles.length > 0) {
      this.description = `${article.idReadable} (${article.childArticles.length})`
    } else {
      this.description = article.idReadable
    }
  }
}
