/**
 * Interface representing a YouTrack entities
 */

export interface UserEntity {
  login: string
  fullName: string
  email: string
  id: string
}

export interface ProjectEntity {
  id: string
  description: string
  name: string
  shortName: string
}

/**
 * Represents a YouTrack issue entity
 */
export interface IssueBaseEntity {
  id: string
  idReadable: string
  projectId: string
  resolved: number
  summary: string
  subtasks: { id: string }[]
}

export interface IssueEntity extends IssueBaseEntity {
  created: number
  updated: number
  description: string | null
}

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
}
