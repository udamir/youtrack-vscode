import { McpClient, parseEntity } from "../helpers/mcp-client"
import { McpService } from "../../src/services/mcp/mcp.service"
import { MockExtensionContext } from "../mock"
import { createServices } from "../helpers/service-helper"
import type { IssueBaseEntity } from "../../src/views"

describe("McpService Integration", () => {
  let client: McpClient
  let mcpService: McpService
  let testIssue: IssueBaseEntity | undefined

  beforeAll(async () => {
    const extensionContext = new MockExtensionContext()

    // Initialize services
    const { youtrackService, vscodeService } = await createServices(extensionContext)

    // Get a test issue to use for file operations
    const projects = await youtrackService.getProjects()
    if (!projects || projects.length === 0) {
      throw new Error("No projects found in YouTrack")
    }

    // Get issues for the project
    const issues = await youtrackService.getIssues(projects[0].shortName)
    if (!issues || issues.length === 0) {
      throw new Error("No issues found in YouTrack")
    }

    testIssue = issues[0]

    mcpService = new McpService(youtrackService, vscodeService)
    await mcpService.start()
    client = new McpClient()
    await client.init()
  })

  afterAll(async () => {
    await mcpService.dispose()
  })

  it("responds to echo tool", async () => {
    const message = "integration test echo"
    const response: any = await client.callTool({ name: "echo", arguments: { message } })
    expect(response.content[0].text).toContain(message)
  })

  it("responds to issues resource", async () => {
    if (!testIssue) {
      throw new Error("No issues found in YouTrack")
    }

    const resourceUri = `yt://issues/${testIssue.idReadable}`
    const response = await client.readResource({ uri: resourceUri })
    expect(response.contents).toBeDefined()
    expect(Array.isArray(response.contents)).toBe(true)
    const issue = parseEntity(response.contents[0]?.text as string)
    expect(issue).toBeDefined()
    expect(issue?.idReadable).toBe(testIssue.idReadable)
    expect(issue?.summary).toBe(testIssue.summary)
  })
})
