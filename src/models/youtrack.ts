import type { Project, Issue, Article, User, Entity } from "youtrack-client"
import type { ISSUE_FIELDS, PROJECT_FIELDS, ARTICLE_FIELDS, USER_PROFILE_FIELDS } from "../consts"

/**
 * Interface representing a YouTrack entities
 */

export interface UserEntity extends Entity<User, typeof USER_PROFILE_FIELDS> {
  login: string
  fullName: string
  email: string
  id: string
}

export interface ProjectEntity extends Entity<Project, typeof PROJECT_FIELDS> {
  id: string
  description: string
  name: string
  shortName: string
}

export interface IssueEntity extends Entity<Issue, typeof ISSUE_FIELDS> {
  id: string
  created: number
  idReadable: string
  project: {
    id: string
  } | null
  resolved: number
  summary: string
  updated: number
  hasChildren?: boolean
  description: string | null
  parentIssue?: {
    id: string
    idReadable?: string
  } | null
}

export interface ArticleEntity extends Entity<Article, typeof ARTICLE_FIELDS> {
  id: string
  content: string
  summary: string
  created: number
  idReadable: string
  updated: number
}
