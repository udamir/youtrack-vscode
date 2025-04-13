/**
 * Constants used for YouTrack integration
 */

export const USER_PROFILE_FIELDS = ["login", "email", "fullName"] as const
export const PROJECT_FIELDS = ["id", "name", "shortName", "description"] as const
export const ISSUE_FIELDS = [
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
export const ARTICLE_FIELDS = ["id", "idReadable", "summary", "content", "created", "updated"] as const
