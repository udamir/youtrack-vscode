import * as vscode from "vscode"

import { YouTrackTreeItem } from "../base"
import {
  FILE_STATUS_CONFLICT,
  FILE_STATUS_MODIFIED,
  FILE_STATUS_OUTDATED,
  FILE_STATUS_SYNCED,
  type YoutrackFileData,
} from "../../services/yt-files"
import type { ProjectEntity } from "../searches"

/**
 * TreeItem for YouTrack projects in the tree view
 */
export class ProjectTreeItem extends YouTrackTreeItem {
  /**
   * Create a new ProjectTreeItem
   *
   * @param project The project to represent
   * @param collapsibleState The collapsible state for the tree item
   * @param isActive Whether this is the active project (optional)
   */
  constructor(
    public readonly project: ProjectEntity,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
  ) {
    super(project.name, collapsibleState, undefined)

    // Set description to show the project shortName
    this.description = project.shortName

    // Set tooltip to include description if available
    if (project.description) {
      this.tooltip = `${project.name} (${project.shortName})\n${project.description}`
    } else {
      this.tooltip = `${project.name} (${project.shortName})`
    }
  }
}

/**
 * Tree item representing a locally edited YouTrack file
 */
export class YoutrackFileTreeItem extends YouTrackTreeItem {
  /**YoutrackFileTreeItem
   * Create a new edited file tree item
   * @param fileInfo Information about the edited file
   */
  constructor(public readonly fileInfo: YoutrackFileData) {
    super(
      fileInfo.metadata.summary,
      vscode.TreeItemCollapsibleState.None,
      {
        title: "Open File",
        command: "vscode.open",
        arguments: [vscode.Uri.file(fileInfo.filePath)],
      },
      `youtrack-edited-file-${fileInfo.syncStatus}`,
    )

    // Set description based on entity type
    this.description = fileInfo.metadata.idReadable

    // Set tooltip
    this.tooltip = `${fileInfo.metadata.idReadable} [${fileInfo.syncStatus}]`

    // Set icon based on sync status
    this.setStatusIcon()
  }

  /**
   * Set the appropriate icon based on sync status
   */
  private setStatusIcon(): void {
    switch (this.fileInfo.syncStatus) {
      case FILE_STATUS_SYNCED:
        // Synced: green circle icon
        this.iconPath = new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.green"))
        break
      case FILE_STATUS_MODIFIED:
        // Modified: filled circle icon, yellow
        this.iconPath = new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.yellow"))
        break
      case FILE_STATUS_OUTDATED:
        // Outdated: arrow icon, gray
        this.iconPath = new vscode.ThemeIcon("arrow-small-right", new vscode.ThemeColor("charts.gray"))
        break
      case FILE_STATUS_CONFLICT:
        // Conflict: warning icon, red
        this.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("charts.red"))
        break
      default:
        this.iconPath = undefined
        break
    }
  }
}
