import type { STATUS_AUTHENTICATED, STATUS_NOT_AUTHENTICATED, STATUS_ERROR } from "./vscode.consts"
import type { ArticleEntity, FilesViewMode, IssueEntity, IssuesViewMode, ProjectEntity } from "../../views"
import type { AgileBoardEntity, IssuesSource, SavedSearchEntity } from "../../views/searches"

/**
 * Interface representing the cache state for YouTrack extension
 */
export interface VscodeCache {
  selectedProjects: ProjectEntity[]
  activeProjectKey?: string
  recentIssues?: IssueEntity[]
  recentArticles?: ArticleEntity[]
  issuesViewMode?: IssuesViewMode
  filesViewMode?: FilesViewMode
  issuesFilter?: string
  savedSearches?: SavedSearchEntity[]
  agileBoards?: AgileBoardEntity[]
  issuesSource?: IssuesSource
}

/**
 * Connection status
 */
export type ConnectionStatus = typeof STATUS_AUTHENTICATED | typeof STATUS_NOT_AUTHENTICATED | typeof STATUS_ERROR
