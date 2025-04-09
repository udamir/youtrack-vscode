/**
 * Interface representing a YouTrack project
 */
export interface Project {
  id: string
  name: string
  shortName: string
  description?: string
  iconUrl?: string
}
