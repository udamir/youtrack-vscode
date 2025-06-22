export interface ProjectEntity {
  id: string
  description: string
  name: string
  shortName: string
}

/**
 * Interface representing a saved search in YouTrack
 */
export interface SavedSearchEntity {
  id: string
  name: string
  query: string
}

/**
 * Interface representing a sprint in YouTrack
 */
export interface SprintEntity {
  id: string
  agile: {
    id: string
    name: string
  }
  name: string
  start?: number
  finish?: number
  archived: boolean
}

/**
 * Interface representing an agile board in YouTrack
 */
export interface AgileBoardEntity {
  id: string
  name: string
  sprints?: SprintEntity[]
}

/**
 * Types of search sources
 */
export type SearchItemType = "project" | "search" | "sprint"

/**
 * Root category types for search tree
 */
export type SearchRootCategory =
  | "projects"
  | "searches"
  | "boards"
  | "standard"
  | "assignedToMe"
  | "commentedByMe"
  | "reportedByMe"
  | "favorites"

/**
 * Interface for tree items in the search panel
 */
export interface SearchTreeItem {
  // Unique identifier for the item
  id: string

  // Display name
  name: string

  // Icon path or ThemeIcon name
  icon?: string

  // For commands and context value
  type: SearchItemType | SearchRootCategory

  // Parent item id (for sprints this would be the agile board id)
  parentId?: string

  // Children items (for root categories and agile boards)
  children?: SearchTreeItem[]

  // Additional data used for displaying issues
  query?: string
  projectShortName?: string
  sprintId?: string
}

/**
 * Interface representing an active search source
 * Used to track the currently selected source in the Issue Searches panel
 */
export type IssuesSource =
  | {
      type: "project"
      source: ProjectEntity
    }
  | {
      type: "search"
      source: SavedSearchEntity
    }
  | {
      type: "sprint"
      source: SprintEntity
    }
  | {
      type: "favorites"
      source?: undefined
    }
  | {
      type: "assignedToMe"
      source?: undefined
    }
  | {
      type: "commentedByMe"
      source?: undefined
    }
  | {
      type: "reportedByMe"
      source?: undefined
    }
