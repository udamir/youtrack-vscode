import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { ArticleEntity, IssueEntity } from "../../src/views"
import { isArticle } from "../../src/services"
import yaml from "js-yaml"

export const parseEntity = (content: string): IssueEntity | ArticleEntity | null => {
  const match = content.match(/^---\n(.*?)---\n(.*)$/s)
  if (!match) {
    return null
  }

  const [_, yamlContent, markdownContent] = match
  const entity = yaml.load(yamlContent) as IssueEntity | ArticleEntity

  if (isArticle(entity)) {
    entity.content = markdownContent
  } else {
    entity.description = markdownContent
  }
  return entity
}

/**
 * Helper client for testing MCP server via HTTP transport.
 */
export class McpClient extends Client {
  constructor() {
    super({
      name: "test-client",
      version: "1.0.0",
    })
  }

  public async init(baseUrl = "http://localhost:4877/mcp") {
    await this.connect(new StreamableHTTPClientTransport(new URL(baseUrl)))
  }
}
