import type { ArticleEntity } from "../articles"
import type { IssueEntity } from "../issues"
import type { PreviewableEntity } from "./preview.types"

/**
 * Determines if the entity is an IssueEntity
 */
export function isIssueEntity(entity: PreviewableEntity): entity is IssueEntity {
  return "idReadable" in entity && "description" in entity
}

/**
 * Determines if the entity is an ArticleEntity
 */
export function isArticleEntity(entity: PreviewableEntity): entity is ArticleEntity {
  return "idReadable" in entity && "content" in entity
}
