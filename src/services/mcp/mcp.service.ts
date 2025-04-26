import type { Server } from "node:http";
import express from "express";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
	McpServer,
	ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import {
	CONFIG_MCP_PORT,
	INTERNAL_ERROR,
	MCP_DEFAULT_PORT,
	MCP_RESOURCE_ARTICLE,
	MCP_RESOURCE_ARTICLE_TEMPLATE,
	MCP_RESOURCE_ISSUE,
	MCP_RESOURCE_ISSUE_TEMPLATE,
} from "./mcp.consts";
import { getEntityResourceTemplateCallback } from "./mcp.resources";
import { Disposable } from "../../utils/disposable";
import type { YouTrackService } from "../youtrack";
import type { VSCodeService } from "../vscode";

/**
 * Service to manage the lifecycle of the MCP server within the YouTrack VSCode extension.
 * Handles activation, deactivation, error handling, and provides status for integration tests.
 */
export class McpService extends Disposable {
	private server: express.Express;
	private mcp: McpServer;
	private transport: StreamableHTTPServerTransport;
	private httpServer?: Server;

	get port() {
		return (
			this.vscodeService.config.get<number>(CONFIG_MCP_PORT) || MCP_DEFAULT_PORT
		);
	}

	constructor(
		private readonly youtrackService: YouTrackService,
		private readonly vscodeService: VSCodeService,
	) {
		super();
		this.mcp = new McpServer({ name: "YouTrack", version: "1.0.0" });
		this.transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});

		this.server = express();
		this.server.use(express.json());

		this.server.post("/mcp", async (req, res) => {
			try {
				await this.transport.handleRequest(req, res, req.body);
				res.on("close", () => this.stop.bind(this));
			} catch (error) {
				console.error("Error handling MCP request:", error);
				if (!res.headersSent) {
					res.status(500).json(INTERNAL_ERROR);
				}
			}
		});

		this.mcp.resource(
			MCP_RESOURCE_ISSUE,
			new ResourceTemplate(MCP_RESOURCE_ISSUE_TEMPLATE, { list: undefined }),
			getEntityResourceTemplateCallback(this.youtrackService),
		);
		this.mcp.resource(
			MCP_RESOURCE_ARTICLE,
			new ResourceTemplate(MCP_RESOURCE_ARTICLE_TEMPLATE, { list: undefined }),
			getEntityResourceTemplateCallback(this.youtrackService),
		);

		this.mcp.tool("echo", { message: z.string() }, async ({ message }) => ({
			content: [{ type: "text", text: `Tool echo: ${message}` }],
		}));
	}

	/**
	 * Starts the MCP server if enabled. Handles logging and error reporting.
	 */
	public async start() {
		await this.mcp.connect(this.transport);
		this.httpServer = this.server.listen(this.port);
	}

	/**
	 * Stops the MCP server and releases resources.
	 */
	public async stop() {
		await this.mcp.close();
		await this.transport.close();
		await new Promise<void>((resolve, reject) => {
			if (this.httpServer) {
				this.httpServer.close((err) => (err ? reject(err) : resolve()));
			} else {
				resolve();
			}
		});
	}

	public async dispose() {
		await this.stop();
	}
}
