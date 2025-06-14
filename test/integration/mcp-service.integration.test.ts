import { McpClient } from "../helpers/mcp-client"
import { McpService } from "../../src/services/mcp/mcp.service"
import { MockExtensionContext } from "../mock"
import { createServices } from "../helpers/service-helper"
import { CONFIG_MCP_PORT, MCP_TOOL_GET_ENTITIES_BY_ID, MCP_TOOL_GET_PROJECTS } from "../../src/services/mcp/mcp.consts"
import type { ArticleEntity, IssueBaseEntity, IssueEntity } from "../../src/views"

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
    vscodeService.config.update(CONFIG_MCP_PORT, 4877)

    mcpService = new McpService(youtrackService, vscodeService)
    await mcpService.start()
    client = new McpClient()
    await client.init()
  })

  afterAll(async () => {
    await mcpService.dispose()
  })

  it("responds to youtrack-get-projects tool", async () => {
    const response: any = await client.callTool({
      name: MCP_TOOL_GET_PROJECTS,
      arguments: {},
    })

    expect(response).toBeDefined()
    expect(response.content).toBeDefined()
    expect(Array.isArray(response.content)).toBe(true)
    expect(response.content.length).toBeGreaterThan(0)

    // Parse the JSON response and handle potential types
    const content = response.content[0].text
    const projects = JSON.parse(content) as any[]

    expect(Array.isArray(projects)).toBe(true)
    expect(projects.length).toBeGreaterThan(0)

    // Check project structure
    const firstProject = projects[0]
    expect(firstProject.id).toBeDefined()
    expect(firstProject.name).toBeDefined()
    expect(firstProject.shortName).toBeDefined()
  })

  it("responds to youtrack-get-entities-by-id tool", async () => {
    // Skip if no test issue is available
    if (!testIssue) {
      console.log("No test issue available. Skipping test.")
      return
    }

    const id = testIssue.idReadable

    const response: any = await client.callTool({
      name: MCP_TOOL_GET_ENTITIES_BY_ID,
      arguments: { ids: [id] },
    })

    expect(response).toBeDefined()
    expect(response.content).toBeDefined()
    expect(Array.isArray(response.content)).toBe(true)
    expect(response.content.length).toBeGreaterThan(0)

    // Parse the JSON response directly
    const content = response.content[0].text
    const entities = JSON.parse(content) as Record<string, IssueEntity | ArticleEntity>

    expect(entities).toBeDefined()
    const issue = entities[id]

    expect(issue).toBeDefined()
    expect(issue.idReadable).toBe(id)
    expect(issue.summary).toBeDefined()
  })
})
