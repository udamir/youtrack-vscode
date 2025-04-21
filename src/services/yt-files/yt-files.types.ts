import type { ArticleEntity, IssueEntity } from "../../views"
import type {
  FILE_STATUS_CONFLICT,
  FILE_STATUS_MODIFIED,
  FILE_STATUS_SYNC,
  FILE_TYPE_ARTICLE,
  FILE_TYPE_ISSUE,
} from "./yt-files.consts"

/**
 * Type definition for entities that can be edited
 */
export type EditableEntityType = typeof FILE_TYPE_ISSUE | typeof FILE_TYPE_ARTICLE

/**
 * Type definition for sync status of edited files
 */
export type YoutrackFileStatus = typeof FILE_STATUS_SYNC | typeof FILE_STATUS_MODIFIED | typeof FILE_STATUS_CONFLICT

/**
 * Interface for file metadata tracking
 */
export interface YoutrackFileData {
  entityType: EditableEntityType
  filePath: string
  lastModified: number
  syncStatus: YoutrackFileStatus
  metadata: FileMetadata
  content: string
}

export type FileMetadata = {
  idReadable: string
  summary: string
  originalHash: string
  [key: string]: string
}

export type YoutrackFileEntity<T extends EditableEntityType> = T extends typeof FILE_TYPE_ISSUE
  ? IssueEntity
  : T extends typeof FILE_TYPE_ARTICLE
    ? ArticleEntity
    : never
