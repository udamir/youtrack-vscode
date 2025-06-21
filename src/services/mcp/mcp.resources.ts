import type { ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp"

import { dumpEntity, resourceError, resourceResource } from "./mcp.utils"
import { entityTypeById, FILE_TYPE_ARTICLE } from "../yt-files"
import type { YouTrackService } from "../youtrack"
import { tryCatch } from "../../utils/tryCatch"

export const getEntityResourceTemplateCallback =
  (youtrackService: YouTrackService): ReadResourceTemplateCallback =>
  async (uri, params) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id

    const [entity, error] =
      entityTypeById(id) === FILE_TYPE_ARTICLE
        ? await tryCatch(youtrackService.getArticleById(id))
        : await tryCatch(youtrackService.getIssueById(id))

    if (error) {
      return resourceError(uri.href, error.message)
    }

    return resourceResource({ [uri.href]: dumpEntity(entity) })
  }

export const getProjectsResourceTemplateCallback =
  (youtrackService: YouTrackService): ReadResourceTemplateCallback =>
  async (uri) => {
    const [projects, error] = await tryCatch(youtrackService.getProjects())

    if (error) {
      return resourceError(uri.href, error.message)
    }

    if (!projects || projects.length === 0) {
      return resourceError(uri.href, "No projects found or you don't have access to any projects.")
    }

    const contents: { uri: string; text: string }[] = []
    for (const project of projects) {
      contents.push({ uri: `${uri.href}/${project.id}`, text: dumpEntity(project) })
    }

    return { contents }
  }
