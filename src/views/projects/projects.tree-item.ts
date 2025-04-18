import * as vscode from "vscode"

import { COMMAND_SET_ACTIVE_PROJECT } from "./projects.consts"
import { YouTrackTreeItem } from "../base"
import type { ProjectEntity } from "./projects.types"

/**
 * TreeItem for YouTrack projects in the tree view
 */
export class ProjectTreeItem extends YouTrackTreeItem {
  /**
   * Create a new ProjectTreeItem
   *
   * @param project The project to represent
   * @param isActive Whether this is the active project
   */
  constructor(
    public readonly project: ProjectEntity,
    public readonly isActive: boolean,
  ) {
    super(
      project.name,
      vscode.TreeItemCollapsibleState.None,
      {
        command: COMMAND_SET_ACTIVE_PROJECT,
        title: "Set as Active Project",
        arguments: [project.shortName],
      },
      isActive ? "youtrack-project-active" : "youtrack-project",
    )

    // Set description to show the project shortName
    this.description = project.shortName

    // Set tooltip to include description if available
    if (project.description) {
      this.tooltip = `${project.name} (${project.shortName})\n${project.description}`
    } else {
      this.tooltip = `${project.name} (${project.shortName})`
    }

    // Set icon based on active state
    if (isActive) {
      this.iconPath = new vscode.ThemeIcon("circle-filled")
    } else {
      this.iconPath = new vscode.ThemeIcon("circle-outline")
    }
  }
}
