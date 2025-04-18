import type { ISSUE_VIEW_MODE_LIST, ISSUE_VIEW_MODE_TREE } from "."

/**
 * ViewMode for issues panel - either list or tree view
 */
export type IssuesViewMode = typeof ISSUE_VIEW_MODE_LIST | typeof ISSUE_VIEW_MODE_TREE

/**
 * Represents a YouTrack issue entity
 */
export interface IssueBaseEntity {
  id: string
  idReadable: string
  projectId: string
  resolved: number
  summary: string
  subtasks: { id: string }[]
  type: string
}

export interface IssueEntity extends IssueBaseEntity {
  created: number
  updated: number
  description: string | null
  attachments: Record<string, string>
}
