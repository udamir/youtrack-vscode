/**
 * Interface representing a YouTrack issue
 */
export interface Issue {
  /**
   * Unique identifier for the issue
   */
  id: string
  /**
   * Issue ID in human-readable format (e.g., ABC-123)
   */
  idReadable: string
  /**
   * Summary of the issue
   */
  summary: string
  /**
   * Current state of the issue
   */
  resolved?: boolean
  /**
   * Project ID that this issue belongs to
   */
  projectId?: string
  /**
   * Creation timestamp
   */
  created?: number
  /**
   * Last updated timestamp
   */
  updated?: number
}
