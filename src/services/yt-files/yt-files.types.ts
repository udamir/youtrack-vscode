import type { ArticleEntity, IssueEntity } from "../../views"
import type {
  FILE_STATUS_CONFLICT,
  FILE_STATUS_MODIFIED,
  FILE_STATUS_OUTDATED,
  FILE_STATUS_SYNCED,
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
export type YoutrackFileStatus =
  | typeof FILE_STATUS_SYNCED
  | typeof FILE_STATUS_MODIFIED
  | typeof FILE_STATUS_CONFLICT
  | typeof FILE_STATUS_OUTDATED

/**
 * Interface for file metadata tracking
 */
export interface YoutrackFileData {
  projectKey: string
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
