import type { Issue } from "./issue"
import type { Project } from "./project"
import type { Article } from "./article"

/**
 * Interface representing the cache state for YouTrack extension
 */

export interface ServerCache {
  selectedProjects: Project[]
  activeProjectId?: string
  recentIssues?: Issue[]
  recentArticles?: Article[]
}
