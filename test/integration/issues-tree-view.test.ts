import { beforeAll, describe, it, expect } from "bun:test"
// import * as assert from "node:assert"

import { MockExtensionContext, MockEventEmitter } from "../mock"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../../src/services"
import {
  ISSUE_VIEW_MODE_LIST,
  ISSUE_VIEW_MODE_TREE,
  IssuesTreeView,
  ProjectsTreeView,
  IssueTreeItem,
} from "../../src/views"
import type { ProjectEntity } from "../../src/views"
import { createServices } from "../helpers/service-helper"

/**
 * This is an integration test for the issues tree view
 * It requires real YouTrack credentials to be set in the environment
 */
describe("Issues Tree View Integration Test", () => {
  // Services
  let issuesTreeView: IssuesTreeView
  let projectsTreeView: ProjectsTreeView

  // Test data
  let testProject: ProjectEntity

  // VS Code mock
  const extensionContext = new MockExtensionContext()
  let projectChangeEmitter: MockEventEmitter<ProjectEntity | undefined>

  beforeAll(async () => {
    const baseUrl = process.env[ENV_YOUTRACK_BASE_URL]
    const token = process.env[ENV_YOUTRACK_TOKEN]

    if (!baseUrl || !token) {
      throw new Error("⚠️ Skipping issues tree view tests - no valid credentials provided")
    }

    try {
      // Create event emitters for mocked events
      projectChangeEmitter = new MockEventEmitter<ProjectEntity | undefined>()

      // Initialize YouTrack service with the extension context
      const { youtrackService, vscodeService } = await createServices(extensionContext)

      // Get a test project to use
      const projects = await youtrackService.getProjects()
      if (projects.length === 0) {
        throw new Error("No projects found in YouTrack")
      }

      testProject = projects[0]

      // Create the cache service
      projectsTreeView = new ProjectsTreeView(extensionContext, youtrackService, vscodeService)
      issuesTreeView = new IssuesTreeView(extensionContext, youtrackService, vscodeService)

      await projectsTreeView.addProject(testProject)
      await projectsTreeView.setActiveProjectCommand(testProject.shortName)
    } catch (error) {
      console.error("Error setting up issues tree view test:", error)
      throw error
    }
  })

  it("should get issues as list items when in list mode", async () => {
    // Ensure we're in list mode
    await issuesTreeView.setListViewMode()

    // Get tree items
    const items = await issuesTreeView.getChildren()

    // Verify we got items
    expect(Array.isArray(items)).toBe(true)
    expect(items.length > 0).toBe(true)

    // Check the first item has the right structure
    const firstItem = items[0]
    expect(firstItem instanceof IssueTreeItem).toBe(true)
    expect(firstItem.label).toBeDefined()
    expect((firstItem as IssueTreeItem).issue).toBeDefined()
  })

  it("should handle project change events", async () => {
    // Simulate a project change event
    projectChangeEmitter.fire(testProject)

    // Wait for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get tree items
    const items = await issuesTreeView.getChildren()

    // Verify we got items for the new project
    expect(Array.isArray(items)).toBe(true)
  })

  it("should toggle between list and tree view modes", async () => {
    // Initial state
    expect(issuesTreeView.viewMode).toBe(ISSUE_VIEW_MODE_LIST)

    // Toggle to tree mode
    await issuesTreeView.setTreeViewMode()
    expect(issuesTreeView.viewMode).toBe(ISSUE_VIEW_MODE_TREE)

    // Toggle back to list mode
    await issuesTreeView.setListViewMode()
    expect(issuesTreeView.viewMode).toBe(ISSUE_VIEW_MODE_LIST)
  })
})
