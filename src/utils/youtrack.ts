import type { Article, Entity, Issue, SingleEnumIssueCustomField } from "youtrack-client"
import type { ARTICLE_FIELDS, ARTICLE_FIELDS_FULL, ISSUE_FIELDS, ISSUE_FIELDS_FULL } from "../consts"
import type { ArticleBaseEntity, ArticleEntity, IssueBaseEntity, IssueEntity } from "../models"

export const getIssueType = (issue: Entity<Issue, typeof ISSUE_FIELDS>): string => {
  const typeField = issue.customFields.find(
    ({ name, value }) => name === "Type" && typeof value === "object" && "name" in value,
  ) as SingleEnumIssueCustomField
  return typeField?.value.name || ""
}

export const getIssueBaseEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS>): IssueBaseEntity => ({
  id: issue.id,
  idReadable: issue.idReadable,
  summary: issue.summary || "Untitled Issue",
  resolved: issue.resolved || 0,
  projectId: issue.project?.id || "",
  subtasks:
    issue.links
      .find(({ linkType, direction }) => linkType?.name === "Subtask" && direction === "OUTWARD")
      ?.issues.map((issue) => ({ id: issue.id })) || [],
  type: getIssueType(issue),
})

export const getIssueEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS_FULL>): IssueEntity => ({
  ...getIssueBaseEntity(issue),
  description: issue.description || "",
  created: issue.created,
  updated: issue.updated,
})

/**
 * Maps a YouTrack API article to our ArticleEntity model
 * @param article YouTrack API article object
 * @returns ArticleEntity
 */
export function getArticleBaseEntity(article: Entity<Article, typeof ARTICLE_FIELDS>): ArticleBaseEntity {
  return {
    id: article.id,
    idReadable: article.idReadable,
    summary: article.summary || "Untitled Article",
    parentArticleId: article.parentArticle?.id,
    projectId: article.project?.id || "",
    childArticles: (article.childArticles || []).map((child) => ({ id: child.id })),
  }
}

export function getArticleEntity(article: Entity<Article, typeof ARTICLE_FIELDS_FULL>): ArticleEntity {
  return {
    ...getArticleBaseEntity(article),
    content: article.content || "",
    updated: article.updated,
    created: article.created,
  }
}
