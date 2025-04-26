export const MCP_DEFAULT_PORT = 4877

export const CONFIG_MCP_PORT = "youtrack.mcpServer.port"
export const CONFIG_MCP_ENABLED = "youtrack.mcpServer.enabled"

export const MCP_RESOURCE_ISSUE = "issue"
export const MCP_RESOURCE_ARTICLE = "article"

export const MCP_RESOURCE_ISSUE_TEMPLATE = "yt://issues/{issueId}"
export const MCP_RESOURCE_ARTICLE_TEMPLATE = "yt://articles/{articleId}"

export const INTERNAL_ERROR = {
  jsonrpc: "2.0",
  error: {
    code: -32603,
    message: "Internal server error",
  },
  id: null,
}
