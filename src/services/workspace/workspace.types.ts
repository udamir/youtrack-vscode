import type { ArticleEntity, IssueEntity, IssuesViewMode, ProjectEntity } from "../../views"

/**
 * Interface representing the cache state for YouTrack extension
 */
export interface WorkspaceCache {
  selectedProjects: ProjectEntity[]
  activeProjectKey?: string
  recentIssues?: IssueEntity[]
  recentArticles?: ArticleEntity[]
  issuesViewMode?: IssuesViewMode
  issuesFilter?: string
}
