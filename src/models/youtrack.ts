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

export interface ArticleEntity {
  id: string
  content: string
  summary: string
  created: number
  idReadable: string
  updated: number
}
