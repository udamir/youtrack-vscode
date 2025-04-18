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
