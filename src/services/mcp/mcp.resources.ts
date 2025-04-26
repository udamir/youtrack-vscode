import type { ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp"
import type { YouTrackService } from "../youtrack"
import { dumpEntity } from "./mcp.utils"
import { entityTypeById, FILE_TYPE_ARTICLE } from "../yt-files"

export const getEntityResourceTemplateCallback =
  (youtrackService: YouTrackService): ReadResourceTemplateCallback =>
  async (uri, params) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id

    const entity =
      entityTypeById(id) === FILE_TYPE_ARTICLE
        ? await youtrackService.getArticleById(id)
        : await youtrackService.getIssueById(id)

    return {
      contents: [
        {
          uri: uri.href,
          text: dumpEntity(entity),
        },
      ],
    }
  }
