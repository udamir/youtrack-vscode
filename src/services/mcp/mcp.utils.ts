import yaml from "js-yaml"
import type { ArticleEntity, IssueEntity, ProjectEntity } from "../../views"
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types"

export const dumpEntity = (entity: IssueEntity | ArticleEntity | ProjectEntity | null): string => {
  if (!entity) {
    return ""
  }

  const { content, description, ...rest } = entity as any

  return `---\n${yaml.dump(rest)}---\n${content || description || ""}`
}

export const mcpError = (text: string): CallToolResult => ({
  content: [{ type: "text" as const, text: `Error: ${text}` }],
  isError: true,
})

export const mcpTextResponse = (data: string | object): CallToolResult => ({
  content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
  isError: false,
})

export const mcpUriResponse = (uri: URL, text: string): ReadResourceResult => ({
  contents: [{ uri: uri.href, text }],
})

export const mcpUriError = (uri: URL, text: string): ReadResourceResult => ({
  contents: [{ uri: uri.href, text: `Error: ${text}` }],
  isError: true,
})
