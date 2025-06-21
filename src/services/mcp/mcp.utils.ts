import yaml from "js-yaml"
import type { ArticleEntity, IssueEntity, ProjectEntity } from "../../views"
import type { CallToolResult, JSONRPCError, ReadResourceResult } from "@modelcontextprotocol/sdk/types"

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

export const toolTextResponse = (data: string | Array<string>, mimeType = "text/yaml"): CallToolResult => {
  const content = Array.isArray(data) ? data : [data]
  return { content: content.map((text) => ({ type: "text" as const, text, mimeType })) }
}

export const resourceResource = (resources: Record<string, string>, baseUri = ""): ReadResourceResult => ({
  contents: Object.entries(resources).map(([id, content]) => ({ uri: `${baseUri}${id}`, text: content })),
})

export const resourceError = (baseUri: string, text: string): ReadResourceResult => ({
  contents: [{ uri: baseUri, text: `Error: ${text}` }],
  isError: true,
})

export const mcpResourceNotFound = (uri: string): JSONRPCError => ({
  jsonrpc: "2.0",
  id: 5,
  error: {
    code: -32002,
    message: "Resource not found",
    data: {
      uri: uri,
    },
  },
})
