import type { Article, Entity, Issue } from "youtrack-client"
import type { ARTICLE_FIELDS, ISSUE_FIELDS } from "../consts"
import type { ArticleEntity, IssueEntity } from "../models"

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
      ?.issues.map((issue) => ({ id: issue.id })) || [],
  created: issue.created,
  updated: issue.updated,
})

/**
 * Maps a YouTrack API article to our ArticleEntity model
 * @param article YouTrack API article object
 * @returns ArticleEntity
 */
export function getArticleEntity(article: any): ArticleEntity {
  // Check if we have a valid article object
  if (!article || !article.id) {
    throw new Error("Invalid article object")
  }
  
  const isFolder = Boolean(article.childArticles && article.childArticles.length > 0)
  
  return {
    id: article.id,
    title: article.summary || "Untitled Article",
    summary: article.summary || "",
    content: article.content || "",
    updatedDate: article.updatedDate || article.updated || Date.now(),
    createdDate: article.createdDate || article.created || Date.now(),
    parentArticleId: article.parentArticle?.id,
    visibility: article.visibility?.name || "Default",
    project: {
      id: article.project?.id || "",
      name: article.project?.name || "",
      shortName: article.project?.shortName || "",
    },
    folders: (article.folders || []).map((f: any) => f.name),
    isFolder,
    childArticles: (article.childArticles || []).map((child: any) => getArticleEntity(child)),
  }
}
