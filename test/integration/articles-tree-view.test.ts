import { beforeAll, describe, it, expect } from "bun:test"

import { ArticlesTreeView, ArticleTreeItem } from "../../src/views"
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
  }) // Increase timeout for API calls

  it("should return a message when no active project is selected", async () => {
    const activeProject = projectsTreeView.activeProject?.shortName
    await projectsTreeView.setActiveProjectCommand(undefined)

    // Get top-level items
    const articles = await articlesTreeView.getChildren()

    // If no active project available, should show message
    expect(articles.length).toBe(1)
    expect(articles[0].label).toBe("No active project")

    // Restore original active project
    await projectsTreeView.setActiveProjectCommand(activeProject)
  })

  it("should fetch articles for a selected project", async () => {
    // Get articles
    const articles = await articlesTreeView.getChildren()

    // Verify the response (either articles or a "no articles" message)
    expect(Array.isArray(articles)).toBe(true)

    // If we have articles, verify their structure
    const hasArticles = articles.length > 0 && articles[0] instanceof ArticleTreeItem
    if (hasArticles) {
      const article = (articles[0] as ArticleTreeItem).article
      expect(article.id).toBeDefined()
      expect(article.summary).toBeDefined()
    } else if (articles.length === 1) {
      // If no articles, verify the "no articles" message
      expect(articles[0].label).toBe("No articles found")
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
    expect(eventFired).toBe(true)

    // Clean up
    disposable.dispose()
  })
})
