import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { afterEach, beforeEach, describe, it, expect } from "bun:test"

import {
  scanYoutrackFiles,
  parseYoutrackFile,
  FILE_STATUS_SYNCED,
  FILE_TYPE_ISSUE,
  FILE_TYPE_ARTICLE,
  writeYtFile,
} from "../../src/services"
import type { ArticleEntity, IssueEntity } from "../../src/views"
import { mockArticles, mockIssues } from "../mock"

describe("File Sync Utils", () => {
  let tempDir: string

  // Create a temporary directory for tests
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "youtrack-test-"))
  })

  // Clean up after tests
  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe("parseYoutrackFile", () => {
    it("should parse a valid issue .yt file", () => {
      // Create a valid issue file
      const filePath = path.join(tempDir, "TEST-123.yt")

      const issue: IssueEntity = {
        ...mockIssues[0],
        description: "This is a test issue description",
      }

      writeYtFile(filePath, issue)

      // Test parsing
      const result = parseYoutrackFile(filePath)

      // Verify result
      expect(result).toBeDefined()
      if (result) {
        expect(result.entityType).toBe(FILE_TYPE_ISSUE)
        expect(result.syncStatus).toBe(FILE_STATUS_SYNCED)
        expect(result.metadata.idReadable).toBe(issue.idReadable)
        expect(result.metadata.summary).toBe(issue.summary)
        expect(result.content).toBe(issue.description || "")
      }
    })

    it("should parse a valid article .yt file", () => {
      // Create a valid article file
      const filePath = path.join(tempDir, "KB-A-123.yt")
      const article: ArticleEntity = {
        ...mockArticles[0],
        content: "# Article Title\n\nThis is a test article content",
      }
      writeYtFile(filePath, article)

      // Test parsing
      const result = parseYoutrackFile(filePath)

      // Verify result
      expect(result).toBeDefined()
      if (result) {
        expect(result.entityType).toBe(FILE_TYPE_ARTICLE)
        expect(result.syncStatus).toBe(FILE_STATUS_SYNCED)
        expect(result.metadata.idReadable).toBe(article.idReadable)
        expect(result.metadata.summary).toBe(article.summary)
        expect(result.content).toBe(article.content)
      }
    })

    it("should return undefined for a non-existent file", () => {
      const result = parseYoutrackFile(path.join(tempDir, "non-existent.yt"))
      expect(result).toBeUndefined()
    })

    it("should return undefined for a file with invalid frontmatter", () => {
      // Create a file with invalid frontmatter
      const filePath = path.join(tempDir, "invalid.yt")
      fs.writeFileSync(filePath, "Not a valid YAML frontmatter\n---\nSome content", "utf8")

      const result = parseYoutrackFile(filePath)
      expect(result).toBeUndefined()
    })

    it("should return undefined for a file with missing required fields", () => {
      // Create a file with missing required fields
      const filePath = path.join(tempDir, "missing-fields.yt")
      const entity: Partial<IssueEntity> = {
        idReadable: "TEST-123",
        description: "This is a test issue description",
      }
      writeYtFile(filePath, entity as IssueEntity)

      const result = parseYoutrackFile(filePath)
      expect(result).toBeUndefined()
    })
  })

  describe("scanYoutrackFiles", () => {
    it("should return an empty map for an empty directory", () => {
      const result = scanYoutrackFiles(tempDir)
      expect(result.length).toBe(0)
    })

    it("should return an empty map for a non-existent directory", () => {
      const result = scanYoutrackFiles("/path/does/not/exist")
      expect(result.length).toBe(0)
    })

    it("should scan and parse multiple .yt files", () => {
      // Create test files
      createTestFile("TEST-1.yt", FILE_TYPE_ISSUE, "TEST-1", "First issue")
      createTestFile("TEST-2.yt", FILE_TYPE_ISSUE, "TEST-2", "Second issue")
      createTestFile("KB-1.yt", FILE_TYPE_ARTICLE, "KB-1", "First article")

      // Create a non-.yt file that should be ignored
      fs.writeFileSync(path.join(tempDir, "ignore-me.txt"), "Not a .yt file", "utf8")

      // Test scanning
      const result = scanYoutrackFiles(tempDir)

      // Verify result
      expect(result.length).toBe(3)

      // Check if all files were found
      const fileNames = result.map((data) => data.metadata.idReadable)
      expect(fileNames).toContain("TEST-1")
      expect(fileNames).toContain("TEST-2")
      expect(fileNames).toContain("KB-1")

      // Verify content of one file
      const test1 = result.find((data) => data.metadata.idReadable === "TEST-1")
      expect(test1).toBeDefined()
      if (test1) {
        expect(test1.entityType).toBe(FILE_TYPE_ISSUE)
        expect(test1.metadata.summary).toBe("First issue")
      }
    })

    it("should handle invalid files gracefully", () => {
      // Create valid files
      createTestFile("TEST-1.yt", FILE_TYPE_ISSUE, "TEST-1", "Valid issue")

      // Create an invalid .yt file
      fs.writeFileSync(path.join(tempDir, "invalid.yt"), "Not a valid YAML\n---\nSome content", "utf8")

      // Test scanning
      const result = scanYoutrackFiles(tempDir)

      // Verify that only the valid file was parsed
      expect(result.length).toBe(1)
      const fileNames = result.map((data) => data.metadata.idReadable)
      expect(fileNames).toContain("TEST-1")
    })
  })

  // Helper function to create a test .yt file
  function createTestFile(fileName: string, entityType: string, idReadable: string, summary: string): string {
    const filePath = path.join(tempDir, fileName)
    const entity: IssueEntity | ArticleEntity = {
      ...(entityType === FILE_TYPE_ISSUE ? mockIssues[0] : mockArticles[0]),
      idReadable,
      summary,
      content: `Content for ${idReadable}`,
    }
    writeYtFile(filePath, entity)
    return filePath
  }
})
