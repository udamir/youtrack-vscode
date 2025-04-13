import type { ProjectEntity, IssueEntity, ArticleEntity } from "./youtrack"
import type {
  ISSUE_VIEW_MODE_LIST,
  ISSUE_VIEW_MODE_TREE,
  NOT_AUTHENTICATED,
  AUTHENTICATING,
  AUTHENTICATED,
  AUTHENTICATION_FAILED,
} from "../consts/vscode"

/**
 * ViewMode for issues panel - either list or tree view
 */
export type IssuesViewMode = typeof ISSUE_VIEW_MODE_LIST | typeof ISSUE_VIEW_MODE_TREE

/**
 * Authentication states for YouTrack connection
 */
export type AuthState =
  | typeof NOT_AUTHENTICATED
  | typeof AUTHENTICATING
  | typeof AUTHENTICATED
  | typeof AUTHENTICATION_FAILED

/**
 * Interface representing the cache state for YouTrack extension
 */
export interface ServerCache {
  selectedProjects: ProjectEntity[]
  activeProjectKey?: string
  recentIssues?: IssueEntity[]
  recentArticles?: ArticleEntity[]
  issuesViewMode?: IssuesViewMode
}
