import type { Article, Issue, Schema, User, Project } from "youtrack-client"

// Authentication states
export const NOT_AUTHENTICATED = "notAuthenticated"
export const AUTHENTICATING = "authenticating"
export const AUTHENTICATED = "authenticated"
export const AUTHENTICATION_FAILED = "authenticationFailed"

/**
 * Constants used for YouTrack integration
 */

export const USER_PROFILE_FIELDS = ["login", "email", "fullName"] as const satisfies Schema<User>
export const PROJECT_FIELDS = ["id", "name", "shortName", "description"] as const satisfies Schema<Project>
export const ISSUE_FIELDS = [
  "id",
  "idReadable",
  "summary",
  "resolved",
  { project: ["id"] },
  { customFields: ["name", { value: ["name", { color: ["id", "background"] }] }] },
  { links: [{ linkType: ["name"] }, "direction", { issues: ["id"] }, "id"] },
] as const satisfies Schema<Issue>

export const ISSUE_FIELDS_FULL = [
  "id",
  "idReadable",
  "summary",
  "created",
  "updated",
  "description",
  "resolved",
  { attachments: ["id", "url", "name"] },
  { project: ["id"] },
  { customFields: ["name", { value: ["name", { color: ["id", "background"] }] }] },
  { links: [{ linkType: ["name"] }, "direction", { issues: ["id"] }, "id"] },
] as const satisfies Schema<Issue>

/**
 * Fields to fetch for articles
 */
export const ARTICLE_FIELDS = [
  "id",
  "idReadable",
  "summary",
  { parentArticle: ["id"] },
  { project: ["id"] },
  { childArticles: ["id"] },
] as const satisfies Schema<Article>

/**
 * Fields to fetch for articles
 */
export const ARTICLE_FIELDS_FULL = [
  "id",
  "idReadable",
  "summary",
  "content",
  "updated",
  "created",
  { attachments: ["id", "url", "name"] },
  { parentArticle: ["id"] },
  { project: ["id"] },
  { childArticles: ["id"] },
] as const satisfies Schema<Article>
