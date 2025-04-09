/**
 * Interface representing a YouTrack knowledge base article
 */
export interface Article {
  /**
   * Unique identifier for the article
   */
  id: string
  /**
   * Title of the article
   */
  title: string
  /**
   * Summary or brief description of the article
   */
  summary?: string
  /**
   * Creation timestamp
   */
  created?: number
  /**
   * Last updated timestamp
   */
  updated?: number
  /**
   * Project or space ID that this article belongs to
   */
  projectId?: string
}
