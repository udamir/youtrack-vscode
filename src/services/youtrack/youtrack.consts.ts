import type { Article, Issue, Schema, User, Project, Agile, Sprint, SavedQuery } from "youtrack-client"

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
  { project: PROJECT_FIELDS },
  { customFields: ["name", { value: ["name", { color: ["id", "background"] }] }] },
  { links: [{ linkType: ["name"] }, "direction", { issues: ["id", "idReadable", "summary"] }, "id"] },
] as const satisfies Schema<Issue>

export const ISSUE_FIELDS_FULL = [
  ...ISSUE_FIELDS,
  "created",
  "updated",
  "description",
  { attachments: ["id", "url", "name"] },
] as const satisfies Schema<Issue>

/**
 * Fields to fetch for articles
 */
export const ARTICLE_FIELDS = [
  "id",
  "idReadable",
  "summary",
  { parentArticle: ["id"] },
  { project: PROJECT_FIELDS },
  { childArticles: ["id"] },
] as const satisfies Schema<Article>

/**
 * Fields to fetch for articles
 */
export const ARTICLE_FIELDS_FULL = [
  ...ARTICLE_FIELDS,
  "content",
  "updated",
  "created",
  { attachments: ["id", "url", "name"] },
] as const satisfies Schema<Article>

/**
 * Fields to fetch for saved searches
 */
export const SAVED_SEARCH_FIELDS_BASE = ["id", "name", "query"] as const satisfies Schema<SavedQuery>

/**
 * Fields to fetch for sprints
 */
export const SPRINT_FIELDS_BASE = ["id", "name", "start", "finish", "archived"] as const satisfies Schema<Sprint>

/**
 * Fields to fetch for agile boards
 */
export const AGILE_BOARD_FIELDS = [
  "id",
  "name",
  { currentSprint: SPRINT_FIELDS_BASE },
  { sprints: SPRINT_FIELDS_BASE },
] as const satisfies Schema<Agile>
