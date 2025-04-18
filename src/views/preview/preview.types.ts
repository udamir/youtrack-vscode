import type { ArticleEntity } from "../articles"
import type { IssueEntity } from "../issues"

/**
 * Type for content that can be previewed
 */
export type PreviewableEntity = IssueEntity | ArticleEntity
