import type { Entity, Issue } from "youtrack-client"
import type { ISSUE_FIELDS } from "../consts"
import type { IssueEntity } from "../models"

export const getIssueEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS>): IssueEntity => ({
  id: issue.id,
  idReadable: issue.idReadable,
  summary: issue.summary || "",
  description: issue.description || "",
  resolved: issue.resolved || 0,
  projectId: issue.project?.id || "",
  subtasks:
    issue.links
      .find(({ linkType, direction }) => linkType?.name === "Subtask" && direction === "OUTWARD")
      ?.issues.map((issue: any) => ({ id: issue.id })) || [],
  created: issue.created,
  updated: issue.updated,
})
