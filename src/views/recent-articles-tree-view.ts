import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import type { CacheService } from "../services/cache-service"
import type { YouTrackService } from "../services/youtrack-client"
import type { ArticleEntity } from "../models"
import { createLoadingItem } from "./tree-view-utils"

/**
 * Tree item representing a YouTrack knowledge base article
 */
export class ArticleTreeItem extends YouTrackTreeItem {
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

/**
 * Tree data provider for YouTrack recent articles
 */
export class RecentArticlesTreeDataProvider extends BaseTreeDataProvider {
  private _articles: ArticleEntity[] = []
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Create a new recent articles tree data provider
   * @param youtrackService The YouTrack service
   * @param cacheService The cache service to use for storing/retrieving articles
   */
  constructor(
    youtrackService: YouTrackService,
    private readonly _cacheService: CacheService,
  ) {
    super(youtrackService)

    // Register for server change events
    this._serverChangeDisposable = this.youtrackService.onServerChanged(this.loadFromCache.bind(this))

    // Load initial data from cache
    this.loadFromCache()
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this._serverChangeDisposable) {
      this._serverChangeDisposable.dispose()
    }
  }

  /**
   * Get children for the recent articles view
   * @returns Tree items representing recent articles
   */
  protected async getConfiguredChildren(): Promise<YouTrackTreeItem[]> {
    if (this.isLoading) {
      return [createLoadingItem("Loading recent articles...")]
    }

    if (this._articles.length === 0) {
      return [YouTrackTreeItem.withThemeIcon("No recent articles", vscode.TreeItemCollapsibleState.None, "info")]
    }

    return this._articles.map(
      (article) =>
        new ArticleTreeItem(article, {
          command: "vscode.open",
          title: "Open Article",
          arguments: [vscode.Uri.parse(`${this._cacheService.baseUrl}/articles/${article.id}`)],
        }),
    )
  }

  /**
   * Load recent articles from cache
   */
  private loadFromCache(): void {
    this.isLoading = true
    this._articles = this._cacheService.getRecentArticles()
    this.isLoading = false
  }

  /**
   * Add an article to the recent articles list
   * @param article The article to add
   */
  public addArticle(article: ArticleEntity): void {
    // Check if article already exists in the list
    const existingIndex = this._articles.findIndex((a) => a.id === article.id)

    // If it exists, remove it so we can add it to the front
    if (existingIndex >= 0) {
      this._articles.splice(existingIndex, 1)
    }

    // Add to the front of the list
    this._articles = [article, ...this._articles]

    // Save to cache
    this._cacheService.saveRecentArticles(this._articles)

    // Refresh the view
    this.refresh()
  }
}
