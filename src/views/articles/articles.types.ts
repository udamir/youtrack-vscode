/**
 * Represents a YouTrack knowledge base article entity
 */
export interface ArticleBaseEntity {
  id: string
  idReadable: string
  summary: string
  parentArticleId?: string
  projectId: string
  childArticles: { id: string }[]
}

export interface ArticleEntity extends ArticleBaseEntity {
  content: string
  updated: number
  created: number
  attachments: Record<string, string>
}
