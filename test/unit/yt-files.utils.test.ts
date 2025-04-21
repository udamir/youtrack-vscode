import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import * as yaml from "js-yaml"

import {
  scanYoutrackFiles,
  parseYoutrackFile,
  FILE_STATUS_SYNC,
  FILE_TYPE_ISSUE,
  FILE_TYPE_ARTICLE,
} from "../../src/services"

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
      const metadata = {
        idReadable: "TEST-123",
        summary: "Test issue",
      }
      const content = "This is a test issue description"
      writeYtFile(filePath, metadata, content)

      // Test parsing
      const result = parseYoutrackFile(filePath)

      // Verify result
      expect(result).toBeDefined()
      if (result) {
        expect(result.entityType).toBe(FILE_TYPE_ISSUE)
        expect(result.syncStatus).toBe(FILE_STATUS_SYNC)
        expect(result.metadata.idReadable).toBe("TEST-123")
        expect(result.metadata.summary).toBe("Test issue")
        expect(result.content).toBe(content)
      }
    })

    it("should parse a valid article .yt file", () => {
      // Create a valid article file
      const filePath = path.join(tempDir, "Article-123.yt")
      const metadata = {
        id: "5678",
        idReadable: "Article-123",
        summary: "Test article",
        entityType: FILE_TYPE_ARTICLE,
        projectKey: "KB",
      }
      const content = "# Article Title\n\nThis is a test article content"
      writeYtFile(filePath, metadata, content)

      // Test parsing
      const result = parseYoutrackFile(filePath)

      // Verify result
      expect(result).toBeDefined()
      if (result) {
        expect(result.entityType).toBe(FILE_TYPE_ARTICLE)
        expect(result.metadata.idReadable).toBe("Article-123")
        expect(result.metadata.summary).toBe("Test article")
        expect(result.content).toBe(content)
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
      const metadata = {
        summary: "Missing required fields",
        // Missing idReadable and entityType
      }
      writeYtFile(filePath, metadata, "Some content")

      const result = parseYoutrackFile(filePath)
      expect(result).toBeUndefined()
    })

    it("should return undefined for a file with invalid entityType", () => {
      // Create a file with invalid entityType
      const filePath = path.join(tempDir, "invalid-type.yt")
      const metadata = {
        idReadable: "INVALID-123",
        entityType: "invalid-type", // Not issue or article
        summary: "Invalid entity type",
      }
      writeYtFile(filePath, metadata, "Some content")

      const result = parseYoutrackFile(filePath)
      expect(result).toBeUndefined()
    })
  })

  describe("scanYoutrackFiles", () => {
    it("should return an empty map for an empty directory", () => {
      const result = scanYoutrackFiles(tempDir)
      expect(result.size).toBe(0)
    })

    it("should return an empty map for a non-existent directory", () => {
      const result = scanYoutrackFiles("/path/does/not/exist")
      expect(result.size).toBe(0)
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
      expect(result.size).toBe(3)

      // Check if all files were found
      const fileNames = Array.from(result.values()).map((data) => data.metadata.idReadable)
      expect(fileNames).toContain("TEST-1")
      expect(fileNames).toContain("TEST-2")
      expect(fileNames).toContain("KB-1")

      // Verify content of one file
      const test1 = Array.from(result.values()).find((data) => data.metadata.idReadable === "TEST-1")
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
      expect(result.size).toBe(1)
      const fileNames = Array.from(result.values()).map((data) => data.metadata.idReadable)
      expect(fileNames).toContain("TEST-1")
    })
  })

  // Helper function to create a test .yt file
  function createTestFile(fileName: string, entityType: string, idReadable: string, summary: string): string {
    const filePath = path.join(tempDir, fileName)
    const metadata = {
      idReadable,
      entityType,
      summary,
      projectKey: entityType === FILE_TYPE_ISSUE ? "TEST" : "KB",
    }
    const content = `Content for ${idReadable}`
    writeYtFile(filePath, metadata, content)
    return filePath
  }

  // Helper function to write a .yt file with frontmatter and content
  function writeYtFile(filePath: string, metadata: Record<string, any>, content: string): void {
    const yamlFrontmatter = yaml.dump(metadata)
    const fileContent = `---\n${yamlFrontmatter}---\n\n${content}`
    fs.writeFileSync(filePath, fileContent, "utf8")
  }
})
