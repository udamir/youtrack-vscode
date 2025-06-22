import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { VIEW_KNOWLEDGE_BASE, COMMAND_REFRESH_KNOWLEDGE_BASE, COMMAND_SELECT_KB_PROJECT } from "./articles.consts"
import { createBasicItem, createLoadingItem, BaseTreeView, type YouTrackTreeItem } from "../base"
import type { YouTrackService, VSCodeService } from "../../services"
import type { ArticleBaseEntity } from "./articles.types"
import type { ProjectEntity } from "../projects"
import { ArticleTreeItem } from "./articles.tree-item"

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

    // Register commands
    this.registerCommand(COMMAND_REFRESH_KNOWLEDGE_BASE, this.refreshArticlesCommand.bind(this))
    this.registerCommand(COMMAND_SELECT_KB_PROJECT, this.selectProjectCommand.bind(this))

    // Load saved KB project if any
    void this.loadSavedKbProject()

    logger.info("ArticlesTreeView initialized")
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
   * Select a project for Knowledge Base articles
   */
  async selectProjectCommand(): Promise<void> {
    logger.debug("ArticlesTreeView: Select project for Knowledge Base")
    try {
      // Get all projects from YouTrack
      const projects = await this._youtrackService.getProjects()

      if (!projects || projects.length === 0) {
        vscode.window.showInformationMessage("No projects found")
        return
      }

      // Show quick pick with projects
      const selectedItem = await vscode.window.showQuickPick(
        projects.map((project) => ({
          label: project.name,
          description: project.shortName,
          project: project,
        })),
        { placeHolder: "Select a project to view its Knowledge Base articles" },
      )

      if (selectedItem) {
        this._activeProject = selectedItem.project
        await this.saveKnowledgeBaseProject(selectedItem.project)
        this.updateViewTitle(this._activeProject)
        this.refresh()
      }
    } catch (error) {
      logger.error(`Error selecting project for Knowledge Base: ${error}`)
      vscode.window.showErrorMessage(`Failed to load projects: ${error}`)
    }
  }

  /**
   * Load saved Knowledge Base project
   */
  private async loadSavedKbProject(): Promise<void> {
    try {
      // Get saved project from cache
      const savedProject = this._vscodeService.cache.getKnowledgeBaseProject()

      if (savedProject) {
        this._activeProject = savedProject
        this.updateViewTitle(this._activeProject)
        this.refresh()
      }
    } catch (error) {
      logger.error(`Error loading saved Knowledge Base project: ${error}`)
    }
  }

  /**
   * Save selected Knowledge Base project to cache
   */
  private async saveKnowledgeBaseProject(project?: ProjectEntity): Promise<void> {
    try {
      await this._vscodeService.cache.saveKnowledgeBaseProject(project)
    } catch (error) {
      logger.error(`Error saving Knowledge Base project: ${error}`)
    }
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
