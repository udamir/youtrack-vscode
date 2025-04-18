import * as vscode from "vscode"
import { YouTrackTreeItem } from "../base"

import type { IssueBaseEntity, IssuesViewMode } from "./issues.types"
import { COMMAND_PREVIEW_ISSUE, ISSUE_VIEW_MODE_TREE } from "./issues.consts"

/**
 * TreeItem for YouTrack issues in the tree view
 */
export class IssueTreeItem extends YouTrackTreeItem {
  /**
   * Create a new IssueTreeItem
   *
   * @param issue The issue to represent
   * @param viewMode The current view mode
   */
  constructor(
    public readonly issue: IssueBaseEntity,
    viewMode: IssuesViewMode,
  ) {
    // Format resolved issues using Unicode strikethrough characters
    let displayLabel = issue.summary

    // For resolved issues, apply Unicode strikethrough to each character
    if (issue.resolved) {
      // Unicode strikethrough (U+0336) after each character
      displayLabel = Array.from(issue.summary)
        .map((char) => `${char}\u0336`)
        .join("")
    }

    // Set collapsible state based on whether the issue has children and the current view mode
    // In list view, all items should be non-collapsible regardless of subtasks
    // In tree view, items with subtasks should be collapsible
    const collapsibleState =
      viewMode === ISSUE_VIEW_MODE_TREE && issue.subtasks.length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None

    // Create the TreeItem with label and collapsibility
    super(
      displayLabel,
      collapsibleState,
      {
        command: COMMAND_PREVIEW_ISSUE,
        title: "Preview Issue",
        arguments: [issue.idReadable],
      },
      "youtrack-issue",
    )

    // Set the id property to match the issue id for tracking
    this.id = issue.idReadable

    // Set description to show the issue ID
    this.description = issue.idReadable

    // Set tooltip to include additional info
    const status = issue.resolved ? "Resolved" : "Open"
    this.tooltip = `${issue.idReadable}: ${issue.summary}\nStatus: ${status}`

    // Find issue type from custom fields if available
    const issueType = issue.type?.toLowerCase() || ""

    // Apply color based on issue status and type
    if (issue.resolved) {
      // Use ThemeColor for gray text
      this.resourceUri = vscode.Uri.parse("youtrack:resolved")
    }

    if (issueType.includes("bug")) {
      // Set icon for bug issues
      this.iconPath = new vscode.ThemeIcon("bug")

      // Use ThemeColor for red text
      this.resourceUri = vscode.Uri.parse("youtrack:bug")
    } else if (issueType.includes("feature")) {
      this.iconPath = new vscode.ThemeIcon("lightbulb")
    } else if (issueType.includes("epic")) {
      this.iconPath = new vscode.ThemeIcon("rocket")
    } else if (issueType.includes("task")) {
      this.iconPath = new vscode.ThemeIcon("tasklist")
    } else {
      this.iconPath = new vscode.ThemeIcon("issues")
    }
  }
}
