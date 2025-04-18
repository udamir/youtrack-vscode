import * as assert from "node:assert"
import * as dotenv from "dotenv"

import { ArticlesTreeView, ArticleTreeItem } from "../../src/views/articles"
import { VSCodeMock, VSCodeMockHelper } from "../helpers/vscode-mock"
import { CacheService, ViewService, YouTrackService } from "../../src/services"
import { type ProjectEntity, ProjectsTreeView } from "../../src/views/projects"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../../src/services/vscode"

// Load environment variables from .env file if it exists
dotenv.config()

/**
 * This is an integration test for the Knowledge Base Tree View
 * It requires real YouTrack credentials to be set in the environment
 */
describe("Knowledge Base Tree View - Integration Tests", () => {
  // Services
  let youtrackService: YouTrackService
  let cacheService: CacheService
  let projectsTreeView: ProjectsTreeView
  let articlesTreeView: ArticlesTreeView

  // Test data
  let testProject: ProjectEntity

  // VS Code mock
  let vscodeMock: VSCodeMock

  beforeAll(async () => {
    const baseUrl = process.env[ENV_YOUTRACK_BASE_URL]
    const token = process.env[ENV_YOUTRACK_TOKEN]

    if (!baseUrl || !token) {
      throw new Error("⚠️ Skipping knowledge base tests - no valid credentials provided")
    }

    // Initialize VSCodeMock with YouTrack test configuration
    vscodeMock = new VSCodeMock(VSCodeMockHelper.createYouTrackMockConfig({ baseUrl, token }))

    // Initialize services
    youtrackService = new YouTrackService()
    await youtrackService.initialize(vscodeMock.extensionContext)

    // Get a test project to use
    const projects = await youtrackService.getProjects()
    if (projects.length === 0) {
      throw new Error("No projects found in YouTrack")
    }

    testProject = projects[0]

    cacheService = new CacheService(youtrackService, vscodeMock.extensionContext.workspaceState)
    const viewService = new ViewService()

    // Set up providers
    projectsTreeView = new ProjectsTreeView(vscodeMock.extensionContext, youtrackService, viewService, cacheService)
    articlesTreeView = new ArticlesTreeView(vscodeMock.extensionContext, youtrackService, viewService)

    await projectsTreeView.addProject(testProject)
    await projectsTreeView.setActiveProject(testProject.shortName)
  }, 30000) // Increase timeout for API calls

  it("should return a message when no active project is selected", async () => {
    const activeProject = projectsTreeView.activeProject?.shortName
    await projectsTreeView.setActiveProject(undefined)

    // Get top-level items
    const articles = await articlesTreeView.getChildren()

    // If no active project available, should show message
    assert.strictEqual(articles.length, 1, "Should return exactly one item")
    assert.strictEqual(articles[0].label, "No active project", "Should show 'No active project' message")

    // Restore original active project
    await projectsTreeView.setActiveProject(activeProject)
  })

  it("should fetch articles for a selected project", async () => {
    // Get articles
    const articles = await articlesTreeView.getChildren()

    // Verify the response (either articles or a "no articles" message)
    assert.ok(Array.isArray(articles), "Should return an array of items")

    // If we have articles, verify their structure
    const hasArticles = articles.length > 0 && articles[0] instanceof ArticleTreeItem
    if (hasArticles) {
      const article = (articles[0] as ArticleTreeItem).article
      assert.ok(article.id, "Article should have an ID")
      assert.ok(article.summary, "Article should have a summary")
    } else if (articles.length === 1) {
      // If no articles, verify the "no articles" message
      assert.strictEqual(articles[0].label, "No articles found", "Should show 'No articles found' message")
    }
  }, 30000) // Increase timeout for API calls

  it("should handle refresh correctly", () => {
    // Set up a listener for the onDidChangeTreeData event
    let eventFired = false
    const disposable = articlesTreeView.onDidChangeTreeData(() => {
      eventFired = true
    })

    // Call refresh
    articlesTreeView.refresh()

    // Verify event was fired
    assert.strictEqual(eventFired, true, "Refresh should fire onDidChangeTreeData event")

    // Clean up
    disposable.dispose()
  })
})
