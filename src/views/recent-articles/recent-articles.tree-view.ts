import * as vscode from "vscode"
import { BaseTreeView, YouTrackTreeItem, createLoadingItem } from "../base"
import { RecentArticleTreeItem } from "./recent-articles.tree-item"
import type { CacheService, VSCodeService } from "../../services"

import { VIEW_RECENT_ARTICLES } from "./recent-articles.consts"
import type { ArticleEntity } from "../articles"

/**
 * Tree data provider for YouTrack recent articles
 */
export class RecentArticlesTreeView extends BaseTreeView<RecentArticleTreeItem | YouTrackTreeItem> {
  private _articles: ArticleEntity[] = []
  private _serverChangeDisposable: vscode.Disposable | undefined

  /**
   * Create a new recent articles tree data provider
   * @param youtrackService The YouTrack service to use for storing/retrieving articles
   * @param vscodeService The VSCode service to use for handle server change events
   */
  constructor(
    _context: vscode.ExtensionContext,
    // private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_RECENT_ARTICLES, _context)

    // Register for server change events
    this._serverChangeDisposable = this._vscodeService.onServerChanged(this.loadFromCache.bind(this))

    // Load initial data from cache
    this.loadFromCache()
  }

  get cache(): CacheService {
    return this._vscodeService.cache
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
  public async getChildren(): Promise<YouTrackTreeItem[]> {
    if (this.isLoading) {
      return [createLoadingItem("Loading recent articles...")]
    }

    if (this._articles.length === 0) {
      return [YouTrackTreeItem.withThemeIcon("No recent articles", vscode.TreeItemCollapsibleState.None, "info")]
    }

    return this._articles.map(
      (article) =>
        new RecentArticleTreeItem(article, {
          command: "vscode.open",
          title: "Open Article",
          arguments: [vscode.Uri.parse(`${this.cache.baseUrl}/articles/${article.id}`)],
        }),
    )
  }

  /**
   * Load recent articles from cache
   */
  private loadFromCache(): void {
    this.isLoading = true
    this._articles = this.cache.getRecentArticles()
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
    this.cache.saveRecentArticles(this._articles)

    // Refresh the view
    this.refresh()
  }
}
