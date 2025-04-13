import * as assert from "node:assert"
import * as dotenv from "dotenv"

import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN, ISSUE_VIEW_MODE_LIST, ISSUE_VIEW_MODE_TREE } from "../../src/consts"
import { IssuesTreeDataProvider, IssueTreeItem } from "../../src/views/issues-tree-view"
import { VSCodeMock, VSCodeMockHelper, MockEventEmitter } from "../helpers/vscode-mock"
import { ProjectsTreeDataProvider } from "../../src/views/projects-tree-view"
import { YouTrackService, CacheService } from "../../src/services"
import type { ProjectEntity } from "../../src/models"

// Load environment variables from .env file
dotenv.config()

/**
 * This is an integration test for the issues tree view
 * It requires real YouTrack credentials to be set in the environment
 */
describe("Issues Tree View Integration Test", () => {
  // Services
  let youtrackService: YouTrackService
  let cacheService: CacheService
  let issuesProvider: IssuesTreeDataProvider
  let projectsProvider: ProjectsTreeDataProvider

  // Test data
  let testProject: ProjectEntity

  // VS Code mock
  let vscodeMock: VSCodeMock
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

      // Initialize VSCodeMock with YouTrack test configuration
      vscodeMock = new VSCodeMock(
        VSCodeMockHelper.createYouTrackMockConfig({ baseUrl, token, issuesViewMode: ISSUE_VIEW_MODE_LIST }),
      )

      // Then initialize YouTrack service with the extension context
      youtrackService = new YouTrackService()
      await youtrackService.initialize(vscodeMock.extensionContext)

      // Get a test project to use
      const projects = await youtrackService.getProjects()
      if (projects.length === 0) {
        throw new Error("No projects found in YouTrack")
      }

      testProject = projects[0]

      // Create the cache service
      cacheService = new CacheService(youtrackService, vscodeMock.extensionContext.workspaceState)

      // Create projects and issues providers
      projectsProvider = new ProjectsTreeDataProvider(youtrackService, cacheService)
      issuesProvider = new IssuesTreeDataProvider(youtrackService, cacheService, projectsProvider)

      await projectsProvider.addProject(testProject)
      await projectsProvider.setActiveProject(testProject.shortName)
    } catch (error) {
      console.error("Error setting up issues tree view test:", error)
      throw error
    }
  })

  it("should get issues as list items when in list mode", async () => {
    // Ensure we're in list mode
    issuesProvider.viewMode = ISSUE_VIEW_MODE_LIST

    // Get tree items
    const items = await issuesProvider.getChildren()

    // Verify we got items
    assert.ok(Array.isArray(items), "Items should be an array")
    assert.ok(items.length > 0, "Should have at least one item if project has issues")

    // Check the first item has the right structure
    const firstItem = items[0]
    assert.ok(firstItem instanceof IssueTreeItem, "First item should be an IssueTreeItem")
    assert.ok(firstItem.label, "Item should have a label")
    assert.ok(firstItem.issue, "Item should have an issue object")
  })

  it("should handle project change events", async () => {
    // Simulate a project change event
    projectChangeEmitter.fire(testProject)

    // Wait for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get tree items
    const items = await issuesProvider.getChildren()

    // Verify we got items for the new project
    assert.ok(Array.isArray(items), "Items should be an array")
  })

  it("should toggle between list and tree view modes", () => {
    // Initial state
    assert.strictEqual(issuesProvider.viewMode, ISSUE_VIEW_MODE_LIST)

    // Toggle to tree mode
    issuesProvider.viewMode = ISSUE_VIEW_MODE_TREE
    assert.strictEqual(issuesProvider.viewMode, ISSUE_VIEW_MODE_TREE)

    // Toggle back to list mode
    issuesProvider.viewMode = ISSUE_VIEW_MODE_LIST
    assert.strictEqual(issuesProvider.viewMode, ISSUE_VIEW_MODE_LIST)
  })
})
