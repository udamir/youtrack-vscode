import * as assert from "node:assert"
import { IssuesTreeDataProvider } from "../../src/views/issues-tree-view"
import { YouTrackService } from "../../src/services/youtrack-client"
import { CacheService } from "../../src/services/cache-service"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN, ISSUE_VIEW_MODE_LIST, ISSUE_VIEW_MODE_TREE } from "../../src/consts"
import type { ProjectEntity, IssueEntity } from "../../src/models"
import * as dotenv from "dotenv"
import { VSCodeMock, VSCodeMockHelper, MockEventEmitter } from "../helpers/vscode-mock"
import { ProjectsTreeDataProvider } from "../../src/views/projects-tree-view"

// Load environment variables from .env file
dotenv.config()

// Check if we have YouTrack credentials for integration tests
const hasCredentials = !!process.env[ENV_YOUTRACK_TOKEN] && !!process.env[ENV_YOUTRACK_BASE_URL]

// Conditionally run tests only if credentials are available
const testRunner = hasCredentials ? describe : describe.skip

/**
 * This is an integration test for the issues tree view
 * It requires real YouTrack credentials to be set in the environment
 */
testRunner("Issues Tree View Integration Test", () => {
  // Services
  let youtrackService: YouTrackService
  let cacheService: CacheService
  let issuesProvider: IssuesTreeDataProvider

  // Test data
  let testProject: ProjectEntity
  let testProjectIssues: IssueEntity[]

  // VS Code mock
  let vscodeMock: VSCodeMock
  let projectChangeEmitter: MockEventEmitter<{ projectId: string; project: ProjectEntity | undefined }>

  beforeAll(async () => {
    if (!hasCredentials) {
      console.warn(" Skipping issues tree view tests - no valid credentials provided")
      return
    }

    try {
      // Create event emitters for mocked events
      projectChangeEmitter = new MockEventEmitter<{ projectId: string; project: ProjectEntity | undefined }>()

      // Initialize VSCodeMock with YouTrack test configuration
      vscodeMock = new VSCodeMock(
        VSCodeMockHelper.createYouTrackMockConfig({
          baseUrl: process.env[ENV_YOUTRACK_BASE_URL],
          token: process.env[ENV_YOUTRACK_TOKEN],
          issuesViewMode: ISSUE_VIEW_MODE_LIST,
        }),
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

      // Get issues for the test project
      testProjectIssues = await youtrackService.getIssues(testProject.id)

      // Update the VSCodeMock with the actual project data
      // This allows us to use this data in subsequent tests
      await vscodeMock.extensionContext.globalState.update("youtrack-active-project-id", testProject.id)
      await vscodeMock.extensionContext.workspaceState.update("youtrack-selected-projects", [testProject])

      // Create the cache service with youtrackService and workspaceState
      cacheService = new CacheService(youtrackService, vscodeMock.extensionContext.workspaceState)

      // Create projects provider
      const projectsProvider = new ProjectsTreeDataProvider(youtrackService, cacheService)

      // Create issues provider
      issuesProvider = new IssuesTreeDataProvider(youtrackService, cacheService, projectsProvider)
    } catch (error) {
      console.error("Error setting up issues tree view test:", error)
      throw error
    }
  })

  it("should get issues as list items when in list mode", async () => {
    if (!hasCredentials) return

    // Ensure we're in list mode
    issuesProvider.viewMode = ISSUE_VIEW_MODE_LIST

    // Get tree items
    const items = await issuesProvider.getChildren()

    // Verify we got items
    assert.ok(Array.isArray(items), "Items should be an array")
    if (testProjectIssues.length > 0) {
      assert.ok(items.length > 0, "Should have at least one item if project has issues")

      // Check the first item has the right structure
      const firstItem = items[0] as any
      assert.ok(firstItem.label, "Item should have a label")
      assert.ok(firstItem.issue, "Item should have an issue object")
    }
  })

  it("should handle project change events", async () => {
    if (!hasCredentials) return

    // Simulate a project change event
    projectChangeEmitter.fire({
      projectId: testProject.id,
      project: testProject,
    })

    // Wait for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get tree items
    const items = await issuesProvider.getChildren()

    // Verify we got items for the new project
    assert.ok(Array.isArray(items), "Items should be an array")
  })

  it("should toggle between list and tree view modes", () => {
    if (!hasCredentials) return

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
