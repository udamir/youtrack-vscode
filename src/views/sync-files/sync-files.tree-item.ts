import * as vscode from "vscode"
import { YouTrackTreeItem } from "../base"

/**
 * Tree item for synchronized YouTrack files
 */
export class SyncFileTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly fileId: string,
    public readonly filename: string,
    public readonly projectShortName: string,
    public readonly syncStatus: string,
    public readonly isModified: boolean,
  ) {
    // Create command to open the file when clicked
    const command: vscode.Command = {
      command: "youtrack.openSyncFile",
      title: "Open File",
      arguments: [fileId],
    }

    super(filename, vscode.TreeItemCollapsibleState.None, command, "sync-file")

    // Set appropriate icon based on status
    if (isModified) {
      this.setThemeIcon("edit")
      this.description = "Modified"
    } else {
      this.setThemeIcon("file")
    }

    // Add tooltip with details
    this.tooltip = `${this.filename} (${this.projectShortName}) - ${syncStatus}`
  }
}

/**
 * Tree item for project group in file sync tree (tree view mode)
 */
export class SyncFileProjectGroupItem extends YouTrackTreeItem {
  constructor(
    public readonly projectId: string,
    public readonly label: string,
    public readonly count: number,
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed, undefined, "sync-file-project")

    // Set folder icon
    this.setThemeIcon("symbol-folder")

    // Add count as description
    this.description = count.toString()
  }
}
