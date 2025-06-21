import type { Article, Entity, Issue, SingleEnumIssueCustomField } from "youtrack-client"
import type { ARTICLE_FIELDS, ARTICLE_FIELDS_FULL, ISSUE_FIELDS, ISSUE_FIELDS_FULL } from "./youtrack.consts"
import type { ArticleBaseEntity, ArticleEntity, IssueBaseEntity, IssueEntity, LinkType, IssueLink } from "../../views"

export const getEntityTypeById = (id: string): "issue" | "article" => {
  const [_, __, articleId] = id.split("-")
  return articleId ? "article" : "issue"
}

export const getIssueLinks = (
  issue: Entity<Issue, typeof ISSUE_FIELDS>,
): Record<Exclude<LinkType, "parent">, IssueLink[]> & { parent?: IssueLink } => {
  const links = {} as Record<Exclude<LinkType, "parent">, IssueLink[]> & { parent?: IssueLink }
  issue.links.forEach(({ linkType, direction, issues }) => {
    if (!issues.length) {
      return
    }
    const linkTypeStr = getIssueLinkType(linkType?.name || "", direction)
    if (linkTypeStr) {
      if (linkTypeStr === "parent") {
        links.parent = {
          id: issues[0].idReadable || "",
          summary: issues[0].summary || "",
        }
      } else {
        links[linkTypeStr] = issues.map(({ idReadable, summary }) => ({ id: idReadable, summary: summary || "" }))
      }
    }
  })

  return links
}

export const getIssueType = (issue: Entity<Issue, typeof ISSUE_FIELDS>): string => {
  const typeField = issue.customFields.find(
    ({ name, value }) => name === "Type" && typeof value === "object" && "name" in value,
  ) as SingleEnumIssueCustomField
  return typeField?.value.name || ""
}

export const getIssueLinkType = (linkType: string, direction: string): LinkType | "" => {
  switch (true) {
    case linkType === "Subtask" && direction === "OUTWARD":
      return "subtasks"
    case linkType === "Subtask" && direction === "INWARD":
      return "parent"
    case linkType === "Depend" && direction === "INWARD":
      return "dependencies"
    case linkType === "Depend" && direction === "OUTWARD":
      return "dependant"
    case linkType === "Duplicate" && direction === "INWARD":
      return "duplicates"
    case linkType === "Relates" && direction === "BOTH":
      return "related"
    default:
      return ""
  }
}

export const getIssueBaseEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS>): IssueBaseEntity => ({
  id: issue.id,
  idReadable: issue.idReadable,
  summary: issue.summary || "Untitled Issue",
  resolved: issue.resolved || 0,
  projectId: issue.project?.id || "",
  ...getIssueLinks(issue),
  type: getIssueType(issue),
})

export const getIssueEntity = (issue: Entity<Issue, typeof ISSUE_FIELDS_FULL>): IssueEntity => ({
  ...getIssueBaseEntity(issue),
  description: issue.description || "",
  created: issue.created,
  updated: issue.updated,
  attachments: issue.attachments.reduce(
    (acc, { name, url }) => {
      if (!name || !url) return acc
      acc[name] = url || ""
      return acc
    },
    {} as Record<string, string>,
  ),
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
    attachments: article.attachments.reduce(
      (acc, { name, url }) => {
        if (!name || !url) return acc
        acc[name] = url || ""
        return acc
      },
      {} as Record<string, string>,
    ),
  }
}
