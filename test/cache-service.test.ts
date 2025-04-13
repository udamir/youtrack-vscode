import * as assert from "node:assert"

import { mockBaseUrl, mockProjects, mockIssues, mockArticles } from "./mock-data/youtrack-data"
import { createMockYouTrackService } from "./helpers/youtrack-service-mock"
import type { YouTrackService } from "../src/services/youtrack-client"
import { VSCodeMock, VSCodeMockHelper } from "./helpers/vscode-mock"
import { CacheService } from "../src/services/cache-service"
import { ISSUE_VIEW_MODE_LIST } from "../src/consts"

describe("CacheService", () => {
  // Test subjects
  let cacheService: CacheService

  // Mock dependencies
  let mockYouTrackService: YouTrackService

  beforeEach(() => {
    // Set up mock YouTrack service
    mockYouTrackService = createMockYouTrackService(mockBaseUrl) as YouTrackService

    // Initialize VSCodeMock with test configuration and our custom storage
    const vscodeMock = new VSCodeMock(VSCodeMockHelper.createMockExtensionContext())

    // Initialize the cache service with mocked dependencies
    cacheService = new CacheService(mockYouTrackService, vscodeMock.extensionContext.workspaceState)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe("Initialization", () => {
    it("should initialize with the YouTrack service base URL", () => {
      assert.strictEqual(cacheService.baseUrl, mockBaseUrl)
    })
  })

  describe("Project data", () => {
    it("should save and retrieve selected projects", async () => {
      // Initially there should be no projects
      assert.deepStrictEqual(cacheService.getSelectedProjects(), [], "Should start with empty projects")

      // Save projects
      await cacheService.saveSelectedProjects(mockProjects)

      // Retrieve and verify
      const retrievedProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(retrievedProjects, mockProjects, "Retrieved projects should match saved projects")
    })

    it("should save and retrieve active project key", async () => {
      // Initially there should be no active project
      assert.strictEqual(cacheService.getActiveProjectKey(), undefined, "Should start with no active project")

      // Save active project
      const testKey = "P1"
      await cacheService.saveActiveProject(testKey)

      // Retrieve and verify
      const retrievedKey = cacheService.getActiveProjectKey()
      assert.strictEqual(retrievedKey, testKey, "Retrieved project key should match saved key")
    })
  })

  describe("Issues data", () => {
    it("should save and retrieve issues view mode", async () => {
      // Initially should have default view mode
      assert.strictEqual(cacheService.getIssuesViewMode(), ISSUE_VIEW_MODE_LIST, "Should start with default view mode")

      // Save view mode
      await cacheService.saveIssuesViewMode(ISSUE_VIEW_MODE_LIST)

      // Retrieve and verify
      const viewMode = cacheService.getIssuesViewMode()
      assert.strictEqual(viewMode, ISSUE_VIEW_MODE_LIST, "Retrieved view mode should match saved mode")
    })

    it("should save and retrieve recent issues", async () => {
      // Initially there should be no recent issues
      assert.deepStrictEqual(cacheService.getRecentIssues(), [], "Should start with empty recent issues")

      // Save recent issues
      await cacheService.saveRecentIssues(mockIssues)

      // Retrieve and verify
      const retrievedIssues = cacheService.getRecentIssues()
      assert.deepStrictEqual(retrievedIssues, mockIssues, "Retrieved issues should match saved issues")
    })
  })

  describe("Articles data", () => {
    it("should save and retrieve recent articles", async () => {
      // Initially there should be no recent articles
      assert.deepStrictEqual(cacheService.getRecentArticles(), [], "Should start with empty recent articles")

      // Save recent articles
      await cacheService.saveRecentArticles(mockArticles)

      // Retrieve and verify
      const retrievedArticles = cacheService.getRecentArticles()
      assert.deepStrictEqual(retrievedArticles, mockArticles, "Retrieved articles should match saved articles")
    })
  })

  describe("Multi-server support", () => {
    it("should store data separately for different servers", async () => {
      // Set up data for original server
      await cacheService.saveSelectedProjects(mockProjects)

      // Verify initial save worked
      const originalProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(originalProjects, mockProjects, "Original server should have all projects")

      // Get the server change callback that was registered during initialization
      const onServerChangedMock = mockYouTrackService.onServerChanged as jest.Mock
      const serverChangeCallback = onServerChangedMock.mock.calls[0][0]

      // Change base URL by simulating a server change
      const newServerUrl = "https://new-server.youtrack.com"
      serverChangeCallback(newServerUrl)

      // After server change, we should have no projects for the new server
      const newServerInitialProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(newServerInitialProjects, [], "New server should start with empty projects")

      // Save different projects for new server
      const newServerProjects = [mockProjects[0]]
      await cacheService.saveSelectedProjects(newServerProjects)

      // Verify new server has only its data
      const newServerRetrievedProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(newServerRetrievedProjects, newServerProjects, "New server should have only one project")

      // Change back to original server
      serverChangeCallback(mockBaseUrl)

      // Original server should still have its original data
      const originalServerProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(originalServerProjects, mockProjects, "Original server should still have all projects")
    })

    it("should handle server disconnection", () => {
      // Get the server change callback that was registered during initialization
      const onServerChangedMock = mockYouTrackService.onServerChanged as jest.Mock
      const serverChangeCallback = onServerChangedMock.mock.calls[0][0]

      // Simulate server disconnect
      serverChangeCallback(undefined)

      // Base URL should be undefined
      assert.strictEqual(cacheService.baseUrl, undefined, "Base URL should be undefined after disconnection")

      // Should return empty data when disconnected
      assert.deepStrictEqual(cacheService.getSelectedProjects(), [], "Should return empty projects when disconnected")
      assert.strictEqual(
        cacheService.getActiveProjectKey(),
        undefined,
        "Should return undefined active project when disconnected",
      )
      assert.deepStrictEqual(cacheService.getRecentIssues(), [], "Should return empty issues when disconnected")
      assert.deepStrictEqual(cacheService.getRecentArticles(), [], "Should return empty articles when disconnected")
    })
  })
})
