import type * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { VIEW_KNOWLEDGE_BASE, COMMAND_REFRESH_KNOWLEDGE_BASE } from "./articles.consts"
import { createBasicItem, createLoadingItem, BaseTreeView } from "../base"
import type { YouTrackService, VSCodeService } from "../../services"
import type { ArticleBaseEntity } from "./articles.types"
import { ArticleTreeItem } from "./articles.tree-item"
import type { ProjectEntity } from "../projects"
import type { YouTrackTreeItem } from "../base"
import type { IssuesSource } from "../searches"

/**
 * Tree view for YouTrack Knowledge Base
 */
export class ArticlesTreeView extends BaseTreeView<ArticleTreeItem | YouTrackTreeItem> {
  private _activeProject?: ProjectEntity
  private _articles: ArticleBaseEntity[] = []

  constructor(
    context: vscode.ExtensionContext,
    private readonly _youtrackService: YouTrackService,
    private readonly _vscodeService: VSCodeService,
  ) {
    super(VIEW_KNOWLEDGE_BASE, context)

    // Setup event listeners for project changes
    this.subscriptions.push(this._vscodeService.onDidChangeIssuesSource(this.onActiveProjectChanged.bind(this)))

    // Register commands
    this.registerCommand(COMMAND_REFRESH_KNOWLEDGE_BASE, this.refreshArticlesCommand.bind(this))

    logger.info("ArticlesTreeView initialized and listening to ViewService events")
  }

  /**
   * Handler for active project changes
   */
  private onActiveProjectChanged(source?: IssuesSource): void {
    if (!source || source.type !== "project") {
      this._activeProject = undefined
    } else {
      this._activeProject = source.source
    }
    this.updateViewTitle(this._activeProject)
    this.refresh()
  }

  /**
   * Update the view title to include the active project name
   */
  private updateViewTitle = (project?: ProjectEntity) => {
    const projectPrefix = project ? `${project.shortName}: ` : ""
    this.treeView.title = `${projectPrefix}Knowledge Base`
  }

  /**
   * Refresh the articles view
   */
  async refreshArticlesCommand(): Promise<void> {
    this.refresh()
  }

  /**
   * Get the currently active project ID
   */
  public get activeProjectId(): string | undefined {
    return this._activeProject?.shortName
  }

  /**
   * Get children for the Knowledge Base view
   */
  public async getChildren(element?: ArticleTreeItem): Promise<YouTrackTreeItem[]> {
    // Handle case when no active project is selected - show message
    if (!this.activeProjectId) {
      return [
        createBasicItem(
          "No active project",
          "Select a project in the Projects panel",
          "Go to the Projects panel and select a project to view its knowledge base",
        ),
      ]
    }

    if (this.isLoading) {
      return [createLoadingItem("Loading articles...")]
    }

    this.isLoading = true

    try {
      if (!element) {
        // Root level - load top-level articles for the project
        this._articles = await this._youtrackService.getArticles(this.activeProjectId)

        return this._articles.length
          ? this._articles.map((article) => new ArticleTreeItem(article))
          : [createBasicItem("No articles found", "Project has no knowledge base articles")]
      }

      if (element instanceof ArticleTreeItem && element.article.childArticles.length > 0) {
        // Get child articles for the folder
        const children = await this._youtrackService.getChildArticles(element.article.id)

        return children.length
          ? children.map((article) => new ArticleTreeItem(article))
          : [createBasicItem("Empty folder", "This folder contains no articles")]
      }

      // Default case - return empty array
      return []
    } catch (error) {
      logger.error("Error fetching knowledge base articles:", error)
      return [createBasicItem("Error loading articles", "Check connection to YouTrack server")]
    } finally {
      this.isLoading = false
    }
  }
}
