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

export interface IssueEntity {
  id: string
  created: number
  idReadable: string
  projectId: string
  resolved: number
  summary: string
  updated: number
  description: string | null
  subtasks: { id: string }[]
}

/**
 * Represents a YouTrack knowledge base article entity
 */
export interface ArticleEntity {
  id: string
  title: string
  summary?: string
  content?: string
  updatedDate: number
  createdDate: number
  parentArticleId?: string
  visibility: string
  project: {
    id: string
    name: string
    shortName: string
  }
  folders: string[]
  isFolder: boolean
  childArticles: ArticleEntity[]
}
