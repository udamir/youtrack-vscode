import * as assert from "node:assert"

import { mockBaseUrl, mockProjects, mockIssues, mockArticles } from "./mock/youtrack-data"
import { CacheService } from "../src/services"
import { ISSUE_VIEW_MODE_LIST } from "../src/views"
import { MockExtensionContext } from "./mock"

describe("CacheService", () => {
  // Test subjects
  let cacheService: CacheService

  beforeEach(() => {
    // Initialize VSCodeMock with test configuration and our custom storage
    const vscodeMock = new MockExtensionContext()

    // Initialize the cache service with mocked dependencies
    cacheService = new CacheService(vscodeMock.workspaceState)
    
    // Set the base URL - This was missing and causing the tests to fail
    cacheService.setBaseUrl(mockBaseUrl)
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

      // Change base URL by simulating a server change
      const newServerUrl = "https://new-server.youtrack.com"
      cacheService.setBaseUrl(newServerUrl)

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
      cacheService.setBaseUrl(mockBaseUrl)

      // Original server should still have its original data
      const originalServerProjects = cacheService.getSelectedProjects()
      assert.deepStrictEqual(originalServerProjects, mockProjects, "Original server should still have all projects")
    })

    it("should handle server disconnection", () => {
      // Simulate server disconnect
      cacheService.setBaseUrl(undefined)

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
