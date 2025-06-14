import type { Server } from "node:http"
import express from "express"
import { z } from "zod"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { CONFIG_MCP_PORT, INTERNAL_ERROR, MCP_DEFAULT_PORT, MCP_TOOL_GET_PROJECTS } from "./mcp.consts"
import { Disposable } from "../../utils/disposable"
import type { YouTrackService } from "../youtrack"
import type { VSCodeService } from "../vscode"

const mcpError = (text: string) => ({
  content: [{ type: "text" as const, text: `Error: ${text}` }],
  isError: true,
})

/**
 * Service to manage the lifecycle of the MCP server within the YouTrack VSCode extension.
 * Handles activation, deactivation, error handling, and provides status for integration tests.
 */
export class McpService extends Disposable {
  private server: express.Express
  private mcp: McpServer
  private transport: StreamableHTTPServerTransport
  private httpServer?: Server

  get port() {
    return this.vscodeService.config.get<number>(CONFIG_MCP_PORT) || MCP_DEFAULT_PORT
  }

  constructor(
    private readonly youtrackService: YouTrackService,
    private readonly vscodeService: VSCodeService,
  ) {
    super()
    this.mcp = new McpServer({ name: "YouTrack", version: "1.0.0" })
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    this.server = express()
    this.server.use(express.json())

    this.server.post("/mcp", async (req, res) => {
      try {
        await this.transport.handleRequest(req, res, req.body)
        res.on("close", () => this.stop.bind(this))
      } catch (error) {
        console.error("Error handling MCP request:", error)
        if (!res.headersSent) {
          res.status(500).json(INTERNAL_ERROR)
        }
      }
    })

    this.mcp.tool("echo", { message: z.string() }, async ({ message }) => ({
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    }))

    // Tool to list all YouTrack projects - takes no arguments
    this.mcp.tool(MCP_TOOL_GET_PROJECTS, async (_extra) => {
      try {
        if (!this.youtrackService.isConnected()) {
          return mcpError("YouTrack is not connected. Please log in first.")
        }

        const projects = await this.youtrackService.getProjects()

        if (!projects || projects.length === 0) {
          return mcpError("No projects found or you don't have access to any projects.")
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(projects, null, 2),
            },
          ],
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching projects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        }
      }
    })
  }

  /**
   * Starts the MCP server if enabled. Handles logging and error reporting.
   */
  public async start() {
    await this.mcp.connect(this.transport)
    this.httpServer = this.server.listen(this.port)
    console.log(`MCP server started on port ${this.port}`)
  }

  /**
   * Stops the MCP server and releases resources.
   */
  public async stop() {
    await this.mcp.close()
    await this.transport.close()
    await new Promise<void>((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((err) => (err ? reject(err) : resolve()))
      } else {
        resolve()
      }
    })
  }

  public async dispose() {
    await this.stop()
  }
}
