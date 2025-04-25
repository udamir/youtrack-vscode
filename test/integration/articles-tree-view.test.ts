import * as assert from "node:assert"

import { ArticlesTreeView, ArticleTreeItem, ProjectsTreeView } from "../../src/views"
import { MockExtensionContext } from "../mock"
import type { ProjectEntity } from "../../src/views"
import { createServices } from "../helpers/service-helper"

/**
 * This is an integration test for the Knowledge Base Tree View
 * It requires real YouTrack credentials to be set in the environment
 */
describe("Knowledge Base Tree View - Integration Tests", () => {
  // Services
  let projectsTreeView: ProjectsTreeView
  let articlesTreeView: ArticlesTreeView

  // Test data
  let testProject: ProjectEntity

  beforeAll(async () => {
    const extensionContext = new MockExtensionContext()

    // Initialize services
    const { youtrackService, vscodeService } = await createServices(extensionContext)

    // Get a test project to use
    const projects = await youtrackService.getProjects()
    if (projects.length === 0) {
      throw new Error("No projects found in YouTrack")
    }

    testProject = projects[0]

    // Set up providers
    projectsTreeView = new ProjectsTreeView(extensionContext, youtrackService, vscodeService)
    articlesTreeView = new ArticlesTreeView(extensionContext, youtrackService, vscodeService)

    await projectsTreeView.addProject(testProject)
    await projectsTreeView.setActiveProjectCommand(testProject.shortName)
  }, 30000) // Increase timeout for API calls

  it("should return a message when no active project is selected", async () => {
    const activeProject = projectsTreeView.activeProject?.shortName
    await projectsTreeView.setActiveProjectCommand(undefined)

    // Get top-level items
    const articles = await articlesTreeView.getChildren()

    // If no active project available, should show message
    assert.strictEqual(articles.length, 1, "Should return exactly one item")
    assert.strictEqual(articles[0].label, "No active project", "Should show 'No active project' message")

    // Restore original active project
    await projectsTreeView.setActiveProjectCommand(activeProject)
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
