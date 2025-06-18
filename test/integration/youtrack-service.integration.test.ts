import { beforeAll, describe, it, expect } from "bun:test"
import { MockExtensionContext } from "../mock"

import { createServices } from "../helpers/service-helper"
import type { YouTrackService } from "../../src/services"
import type { IssueBaseEntity, ProjectEntity, ArticleBaseEntity } from "../../src/views"
/**
 * Integration tests for the YouTrack service
 *
 * Note: These tests require a valid YouTrack connection with proper credentials
 * set in the .env file (YOUTRACK_BASE_URL and YOUTRACK_TOKEN).
 */
describe("YouTrack Service Integration", () => {
  let youtrackService: YouTrackService

  let testProject: ProjectEntity
  let testIssue: IssueBaseEntity
  let testArticle: ArticleBaseEntity

  // Setup services and test data before all tests
  beforeAll(async () => {
    // Initialize with mock extension context
    const extensionContext = new MockExtensionContext()
    const services = await createServices(extensionContext)

    youtrackService = services.youtrackService

    // Ensure we have a valid connection
    if (!youtrackService.isConnected()) {
      throw new Error("YouTrack service is not connected. Please check your environment variables.")
    }
  })

  describe("Authentication", () => {
    it("should be connected with valid credentials", () => {
      expect(youtrackService.isConnected()).toBe(true)
      expect(youtrackService.client).not.toBeNull()
      expect(youtrackService.baseUrl).toBeDefined()
    })
  })

  describe("Projects", () => {
    it("should fetch projects", async () => {
      const projects = await youtrackService.getProjects()

      expect(projects).toBeDefined()
      expect(Array.isArray(projects)).toBe(true)
      expect(projects.length).toBeGreaterThan(0)

      // Store first project for later tests
      testProject = projects[0]

      expect(testProject.id).toBeDefined()
      expect(testProject.name).toBeDefined()
      expect(testProject.shortName).toBeDefined()
    })

    it("should fetch a specific project by ID", async () => {
      const project = await youtrackService.getProjectById(testProject.id)

      expect(project).not.toBeNull()
      expect(project?.id).toBe(testProject.id)
      expect(project?.name).toBe(testProject.name)
      expect(project?.shortName).toBe(testProject.shortName)
    })

    it("should fetch multiple projects by IDs", async () => {
      const projectIds = [testProject.id]
      const projects = await youtrackService.getProjectsByIds(projectIds)

      expect(projects).toBeDefined()
      expect(Array.isArray(projects)).toBe(true)
      expect(projects.length).toBe(1)
      expect(projects[0].id).toBe(testProject.id)
    })

    it("should return available projects excluding selected ones", async () => {
      // Get all projects first
      const allProjects = await youtrackService.getProjects()
      expect(allProjects.length).toBeGreaterThan(0)

      // Exclude the first project
      const excludeIds = [allProjects[0].id]
      const availableProjects = await youtrackService.getAvailableProjects(excludeIds)

      expect(availableProjects).toBeDefined()
      expect(Array.isArray(availableProjects)).toBe(true)

      // There should be one fewer project than the total
      expect(availableProjects.length).toBe(allProjects.length - 1)

      // The excluded project should not be in the results
      const excludedExists = availableProjects.some((p) => p.id === excludeIds[0])
      expect(excludedExists).toBe(false)
    })
  })

  describe("Issues", () => {
    it("should fetch issues for a project", async () => {
      const issues = await youtrackService.getIssues(testProject.shortName)

      expect(issues).toBeDefined()
      expect(Array.isArray(issues)).toBe(true)

      // Skip further tests if no issues found
      if (issues.length === 0) {
        console.log("No issues found in test project. Skipping related tests.")
        return
      }

      testIssue = issues[issues.length - 1]
      expect(testIssue.id).toBeDefined()
      expect(testIssue.idReadable).toBeDefined()
      expect(testIssue.summary).toBeDefined()
    })

    it("should fetch a specific issue by ID", async () => {
      // Skip if no test issue available
      if (!testIssue) {
        console.log("No test issue available. Skipping test.")
        return
      }

      const issue = await youtrackService.getIssueById(testIssue.idReadable)

      expect(issue).not.toBeNull()
      expect(issue?.id).toBe(testIssue.id)
      expect(issue?.idReadable).toBe(testIssue.idReadable)
      expect(issue?.summary).toBe(testIssue.summary)

      // Full issue should have additional fields
      expect(issue?.description).toBeDefined()
      expect(issue?.created).toBeDefined()
      expect(issue?.updated).toBeDefined()
    })

    it("should fetch child issues correctly", async () => {
      // Skip if no test issue available
      if (!testIssue) {
        console.log("No test issue available. Skipping test.")
        return
      }

      // This test might pass with empty results if there are no child issues
      const childIssues = await youtrackService.getChildIssues(testProject.shortName)
      expect(Array.isArray(childIssues)).toBe(true)
    })
  })

  describe("Articles", () => {
    it("should fetch articles for a project", async () => {
      const articles = await youtrackService.getArticles(testProject.id)

      expect(articles).toBeDefined()
      expect(Array.isArray(articles)).toBe(true)

      // Skip further tests if no articles found
      if (articles.length === 0) {
        console.log("No articles found in test project. Skipping related tests.")
        return
      }

      testArticle = articles[0]
      expect(testArticle.id).toBeDefined()
      expect(testArticle.idReadable).toBeDefined()
      expect(testArticle.summary).toBeDefined()
    })

    it("should fetch a specific article by ID", async () => {
      // Skip if no test article available
      if (!testArticle) {
        console.log("No test article available. Skipping test.")
        return
      }

      const article = await youtrackService.getArticleById(testArticle.idReadable)

      expect(article).not.toBeNull()
      expect(article?.id).toBe(testArticle.id)
      expect(article?.idReadable).toBe(testArticle.idReadable)
      expect(article?.summary).toBe(testArticle.summary)

      // Full article should have additional fields
      expect(article?.content).toBeDefined()
      expect(article?.created).toBeDefined()
      expect(article?.updated).toBeDefined()
    })

    it("should fetch child articles correctly", async () => {
      // Skip if no test article available
      if (!testArticle) {
        console.log("No test article available. Skipping test.")
        return
      }

      // This test might pass with empty results if there are no child articles
      const childArticles = await youtrackService.getChildArticles(testArticle.idReadable)
      expect(Array.isArray(childArticles)).toBe(true)
    })
  })

  // Optional: Update tests that modify data
  // These tests are commented out by default to avoid modifying data unintentionally
  /*
  describe("Data Modification", () => {
    let originalDescription: string
    
    it("should update issue description", async () => {
      if (!testIssue) return

      // Get original issue to restore later
      const originalIssue = await youtrackService.getIssueById(testIssue.idReadable)
      originalDescription = originalIssue?.description || ""
      
      const newDescription = `Updated description for testing - ${Date.now()}`
      const updatedIssue = await youtrackService.updateIssueDescription(
        testIssue.idReadable, 
        newDescription
      )
      
      expect(updatedIssue).toBeDefined()
      expect(updatedIssue.description).toBe(newDescription)
      
      // Restore original description
      await youtrackService.updateIssueDescription(
        testIssue.idReadable, 
        originalDescription
      )
    })
    
    it("should update article content", async () => {
      if (!testArticle) return
      
      // Get original article to restore later
      const originalArticle = await youtrackService.getArticleById(testArticle.idReadable)
      const originalContent = originalArticle?.content || ""
      
      const newContent = `Updated content for testing - ${Date.now()}`
      const updatedArticle = await youtrackService.updateArticleContent(
        testArticle.idReadable, 
        newContent
      )
      
      expect(updatedArticle).toBeDefined()
      expect(updatedArticle.content).toBe(newContent)
      
      // Restore original content
      await youtrackService.updateArticleContent(
        testArticle.idReadable, 
        originalContent
      )
    })
  })
  */
})
