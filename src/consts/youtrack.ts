import type { Article, Issue, Schema, User, Project } from "youtrack-client"

/**
 * Constants used for YouTrack integration
 */

export const USER_PROFILE_FIELDS: Schema<User> = ["login", "email", "fullName"] as const
export const PROJECT_FIELDS: Schema<Project> = ["id", "name", "shortName", "description"] as const
export const ISSUE_FIELDS: Schema<Issue> = [
  "id",
  "idReadable",
  "summary",
  "created",
  "updated",
  "description",
  "resolved",
  { project: ["id"] },
  { links: [{ linkType: ["name"] }, "direction", { issues: ["id"] }, "id"] },
] as const

/**
 * Fields to fetch for articles
 */
export const ARTICLE_FIELDS: Schema<Article> = [
  "id",
  "summary",
  "content",
  "updatedDate",
  "createdDate",
  { parentArticle: ["id"] },
  { visibility: ["id", "name"] },
  { project: PROJECT_FIELDS },
  { folders: ["id", "name", { articles: ["id"] }] },
  { childArticles: ["id", "summary", "content", { visibility: ["id", "name"] }] },
] as const
