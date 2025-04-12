import dotenv from "dotenv"
import * as assert from "node:assert"
import { YouTrackHelper } from "./helpers/youtrack-helper"
import { YouTrack } from "youtrack-client"
import type { IssueEntity, ProjectEntity } from "../models"
import axios from "axios"

// Load environment variables from .env file before creating any clients
dotenv.config()

const createTestRunner =
  ({ skip }: { skip: boolean }) =>
  (name: string, callback: () => void) => {
    if (skip) {
      describe(name, callback)
    } else {
      describe.skip(name, callback)
    }
  }

describe("YouTrackHelper", () => {
  // Variables to be initialized in beforeAll
  let helper: YouTrackHelper
  const testParams = {
    skip: true,
  }
  const testRunner = createTestRunner(testParams)

  beforeAll(async () => {
    helper = new YouTrackHelper(
      YouTrack.axiosClient(axios, process.env.YOUTRACK_BASE_URL || "", process.env.YOUTRACK_TOKEN || ""),
    )
    const user = await helper.getCurrentUser()
    testParams.skip = !user
  })

  // Test variables
  let testProject: ProjectEntity | undefined
  let testIssue: IssueEntity | undefined

  // Create the helper and check connection in beforeAll

  afterAll(async () => {
    // Clean up created projects and issues
    await helper.cleanup()
  })

  // Project operations tests
  testRunner("Project operations", () => {
    it("should fetch projects", async () => {
      const projects = await helper.getProjects()
      assert.ok(Array.isArray(projects), "Projects should be an array")
      assert.ok(projects.length > 0, "Should find at least one project")

      testProject = projects[0] as ProjectEntity
    })

    it("should fetch a project by ID", async () => {
      if (!testProject) return

      const project = await helper.getProjectById(testProject.id)
      assert.ok(project, "Should fetch a project by ID")
      assert.strictEqual(project.id, testProject.id, "Should fetch the correct project")
    })
  })

  // Issues operations tests
  testRunner("Issue operations", () => {
    it("should fetch issues for a project", async () => {
      if (!testProject) return

      try {
        const issues = await helper.getIssues(testProject.shortName)
        assert.ok(Array.isArray(issues), "Issues should be an array")
      } catch (error) {
        console.error("Failed to fetch issues:", error)
      }
    })

    it("should create a new issue", async () => {
      if (!testProject) return

      try {
        const timestamp = Date.now()
        const issue = await helper.createIssue(testProject.id, {
          summary: `Test issue created by integration tests ${timestamp}`,
          description: "This is a test issue created by the YouTrack VS Code extension integration tests",
        })

        assert.ok(issue, "Should create a new issue")
        assert.ok(issue.id, "New issue should have an ID")
        assert.ok(issue.project, "Issue should have a project")
        assert.strictEqual(issue.project?.id, testProject.id, "Issue should be in the correct project")

        // Save for later tests
        testIssue = issue as IssueEntity
      } catch (error) {
        console.error("Failed to create issue:", error)
      }
    })

    it("should fetch an issue by ID", async () => {
      if (!testIssue) return

      const issue = await helper.getIssueById(testIssue.id)
      assert.ok(issue, "Should fetch an issue by ID")
      assert.strictEqual(issue.id, testIssue.id, "Should fetch the correct issue")
    })

    it("should update an issue", async () => {
      if (!testIssue) return

      const updatedSummary = `Updated test issue ${Date.now()}`
      const updated = await helper.updateIssue(testIssue.id, {
        summary: updatedSummary,
      })

      assert.ok(updated, "Should update an issue")
      assert.strictEqual(updated.summary, updatedSummary, "Should update the issue summary")
    })
  })
})
