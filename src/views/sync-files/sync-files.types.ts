import type { FILES_VIEW_MODE_LIST, FILES_VIEW_MODE_TREE } from "./sync-files.consts"

/**
 * View modes for Sync Files
 */
export type FilesViewMode = typeof FILES_VIEW_MODE_LIST | typeof FILES_VIEW_MODE_TREE

/**
 * Interface for synced file data
 */
export interface SyncFileData {
  id: string
  syncStatus: string
  metadata: {
    idReadable: string
    project: {
      id: string
      name: string
      shortName: string
    }
  }
}
