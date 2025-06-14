export const MCP_DEFAULT_PORT = 4877

export const CONFIG_MCP_PORT = "youtrack.mcpServer.port"
export const CONFIG_MCP_ENABLED = "youtrack.mcpServer.enabled"

export const INTERNAL_ERROR = {
  jsonrpc: "2.0",
  error: {
    code: -32603,
    message: "Internal server error",
  },
  id: null,
}

export const MCP_TOOL_GET_PROJECTS = "youtrack-get-projects"
export const MCP_TOOL_GET_ENTITIES_BY_ID = "youtrack-get-entities-by-id"
