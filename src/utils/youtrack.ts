import type { Article, Entity, Issue } from "youtrack-client"
import type { ARTICLE_FIELDS, ISSUE_FIELDS } from "../consts"
import type { ArticleEntity, IssueEntity } from "../models"

export const getIssueEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS>): IssueEntity => ({
  id: issue.id,
  idReadable: issue.idReadable,
  summary: issue.summary || "Untitled Issue",
  description: issue.description || "",
  resolved: issue.resolved || 0,
  projectId: issue.project?.id || "",
  subtasks:
    issue.links
      .find(({ linkType, direction }) => linkType?.name === "Subtask" && direction === "OUTWARD")
      ?.issues.map((issue) => ({ id: issue.id })) || [],
  created: issue.created,
  updated: issue.updated,
})

/**
 * Maps a YouTrack API article to our ArticleEntity model
 * @param article YouTrack API article object
 * @returns ArticleEntity
 */
export function getArticleEntity(article: Entity<Article, typeof ARTICLE_FIELDS>): ArticleEntity {
  return {
    id: article.id,
    idReadable: article.idReadable,
    summary: article.summary || "Untitled Article",
    content: article.content || "",
    updated: article.updated,
    created: article.created,
    parentArticleId: article.parentArticle?.id,
    projectId: article.project?.id || "",
    childArticles: (article.childArticles || []).map((child) => ({ id: child.id })),
  }
}
