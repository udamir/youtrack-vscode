import type { Server } from "node:http"
import express from "express"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types"

import {
  CONFIG_MCP_PORT,
  INTERNAL_ERROR,
  MCP_DEFAULT_PORT,
  MCP_RESOURCE_ARTICLE,
  MCP_RESOURCE_ARTICLE_TEMPLATE,
  MCP_RESOURCE_ISSUE,
  MCP_RESOURCE_ISSUE_TEMPLATE,
  MCP_RESOURCE_PROJECTS,
  MCP_RESOURCE_PROJECTS_TEMPLATE,
  MCP_TOOL_GET_ENTITIES_BY_ID,
  MCP_TOOL_GET_PROJECTS,
} from "./mcp.consts"
import { getEntityResourceTemplateCallback, getProjectsResourceTemplateCallback } from "./mcp.resources"
import { getEntityTypeById, type YouTrackService } from "../youtrack"
import { dumpEntity, mcpError, toolTextResponse } from "./mcp.utils"
import type { GetEntitiesByIdParams } from "./mcp.types"
import { getEntitiesByIdParams } from "./mcp.models"
import { Disposable } from "../../utils/disposable"
import { tryCatch } from "../../utils/tryCatch"
import type { VSCodeService } from "../vscode"
import * as logger from "../../utils/logger"

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

    this.server = express()
    this.server.use(express.json())
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    this.server.post("/mcp", async (req, res) => {
      try {
        await this.transport.handleRequest(req, res, req.body)
        // res.on("close", () => this.stop.bind(this))
      } catch (error) {
        console.error("Error handling MCP request:", error)
        if (!res.headersSent) {
          res.status(500).json(INTERNAL_ERROR)
        }
      }
    })

    this.mcp.resource(
      MCP_RESOURCE_ISSUE,
      new ResourceTemplate(MCP_RESOURCE_ISSUE_TEMPLATE, { list: undefined }),
      getEntityResourceTemplateCallback(this.youtrackService),
    )

    this.mcp.resource(
      MCP_RESOURCE_ARTICLE,
      new ResourceTemplate(MCP_RESOURCE_ARTICLE_TEMPLATE, { list: undefined }),
      getEntityResourceTemplateCallback(this.youtrackService),
    )

    this.mcp.resource(
      MCP_RESOURCE_PROJECTS,
      new ResourceTemplate(MCP_RESOURCE_PROJECTS_TEMPLATE, { list: undefined }),
      getProjectsResourceTemplateCallback(this.youtrackService),
    )

    // Tool to list all YouTrack projects - takes no arguments
    this.mcp.tool(MCP_TOOL_GET_PROJECTS, "Get all available projects", this.getProjects.bind(this))
    this.mcp.tool(
      MCP_TOOL_GET_ENTITIES_BY_ID,
      "Get issues and articles by ID",
      getEntitiesByIdParams,
      this.getEntitiesById.bind(this),
    )
  }

  private async getProjects(): Promise<CallToolResult> {
    logger.debug("mcp.service: getProjects")
    if (!this.youtrackService.isConnected()) {
      return mcpError("YouTrack is not connected. Please log in first.")
    }

    const [projects, error] = await tryCatch(this.youtrackService.getProjects())

    if (error) {
      return mcpError(error.message)
    }

    if (!projects || projects.length === 0) {
      return mcpError("No projects found or you don't have access to any projects.")
    }

    const result = toolTextResponse(projects.map((project) => dumpEntity(project)))

    logger.debug(`mcp.service: getProjects - result: ${JSON.stringify(result, null, 2)}`)

    return result
  }

  private async getEntitiesById({ ids }: GetEntitiesByIdParams): Promise<CallToolResult> {
    logger.debug(`mcp.service: getEntitiesById - ids: ${ids.join(", ")}`)
    if (!this.youtrackService.isConnected()) {
      return mcpError("YouTrack is not connected. Please log in first.")
    }

    const entities: string[] = []
    for (const entityId of ids) {
      const entityType = getEntityTypeById(entityId)
      if (entityType === "issue") {
        const [entity, error] = await tryCatch(this.youtrackService.getIssueById(entityId))
        entities.push(error ? `Error: ${error.message}` : dumpEntity(entity) || `Entity ${entityId} not found`)
      } else if (entityType === "article") {
        const [entity, error] = await tryCatch(this.youtrackService.getArticleById(entityId))
        entities.push(error ? `Error: ${error.message}` : dumpEntity(entity) || `Entity ${entityId} not found`)
      }
    }

    return toolTextResponse(entities)
  }

  /**
   * Starts the MCP server if enabled. Handles logging and error reporting.
   */
  public async start() {
    await this.mcp.connect(this.transport)
    this.httpServer = this.server.listen(this.port)
    logger.info(`MCP server started on port ${this.port}`)
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
    logger.info(`MCP server stopped on port ${this.port}`)
  }

  public async dispose() {
    await this.stop()
  }
}
