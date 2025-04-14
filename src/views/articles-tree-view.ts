import * as vscode from "vscode"
import { BaseTreeDataProvider, YouTrackTreeItem } from "./base-tree-view"
import type { ProjectsTreeDataProvider } from "./projects-tree-view"
import type { YouTrackService } from "../services/youtrack-client"
import type { ArticleBaseEntity, ProjectEntity } from "../models"
import { createLoadingItem } from "./tree-view-utils"
import { COMMAND_PREVIEW_ARTICLE } from "../consts"
import * as logger from "../utils/logger"

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
      article.childArticles.length > 0 ? "folder" : "document",
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

    // Set icon based on folder status
    if (article.childArticles.length > 0) {
      this.iconPath = new vscode.ThemeIcon("folder")
    } else {
      this.iconPath = new vscode.ThemeIcon("book")
    }
  }
}

/**
 * Tree data provider for YouTrack Knowledge Base view
 */
export class ArticlesTreeDataProvider extends BaseTreeDataProvider<ArticleTreeItem | YouTrackTreeItem> {
  private _activeProject?: ProjectEntity
  private _articles: ArticleBaseEntity[] = []
  private _projectChangeDisposable: vscode.Disposable | undefined

  constructor(
    youtrackService: YouTrackService,
    private readonly _projectsProvider: ProjectsTreeDataProvider,
  ) {
    super(youtrackService)

    // Register for project change events
    this._projectChangeDisposable = this._projectsProvider.onDidChangeActiveProject(this._onProjectChanged.bind(this))

    // Get the initial active project
    this._activeProject = this._projectsProvider.activeProject
  }

  /**
   * Get the currently active project ID
   */
  public get activeProjectId(): string | undefined {
    return this._activeProject?.id
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this._projectChangeDisposable) {
      this._projectChangeDisposable.dispose()
      this._projectChangeDisposable = undefined
    }
  }

  /**
   * Get children for the Knowledge Base view when configured
   */
  protected async getConfiguredChildren(element?: ArticleTreeItem): Promise<YouTrackTreeItem[]> {
    if (!this.activeProjectId) {
      const noProject = new YouTrackTreeItem("No active project", vscode.TreeItemCollapsibleState.None)
      noProject.description = "Select a project in the Projects panel"
      noProject.tooltip = "Go to the Projects panel and select a project to view its knowledge base"
      return [noProject]
    }

    if (this.isLoading) {
      return [createLoadingItem("Loading articles...")]
    }

    this.isLoading = true

    try {
      if (!element) {
        // Root level - load top-level articles for the project
        this._articles = await this.youtrackService.getArticles(this.activeProjectId)

        return this._articles.length
          ? this._articles.map((article) => new ArticleTreeItem(article))
          : [this._createNoArticlesItem()]
      }

      if (element instanceof ArticleTreeItem && element.article.childArticles.length > 0) {
        // Get child articles for the folder
        const children = await this.youtrackService.getChildArticles(element.article.id)

        return children.length
          ? children.map((article) => new ArticleTreeItem(article))
          : [this._createEmptyFolderItem()]
      }

      // Default case - return empty array
      return []
    } catch (error) {
      logger.error("Error fetching knowledge base articles:", error)
      const errorItem = new YouTrackTreeItem("Error loading articles", vscode.TreeItemCollapsibleState.None)
      errorItem.tooltip = "Check connection to YouTrack server"
      return [errorItem]
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Create a "No articles found" tree item
   */
  private _createNoArticlesItem(): YouTrackTreeItem {
    const noArticles = new YouTrackTreeItem("No articles found", vscode.TreeItemCollapsibleState.None)
    noArticles.description = "Project has no knowledge base articles"
    return noArticles
  }

  /**
   * Create an "Empty folder" tree item
   */
  private _createEmptyFolderItem(): YouTrackTreeItem {
    const emptyFolder = new YouTrackTreeItem("Empty folder", vscode.TreeItemCollapsibleState.None)
    emptyFolder.description = "This folder contains no articles"
    return emptyFolder
  }

  /**
   * Handle project change events
   */
  private _onProjectChanged(project?: ProjectEntity): void {
    this._activeProject = project
    this.refresh()
  }
}
