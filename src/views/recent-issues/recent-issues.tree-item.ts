import * as vscode from "vscode"
import { YouTrackTreeItem } from "../base"
import type { IssueEntity } from "../issues"

/**
 * Tree item representing a YouTrack issue
 */
export class RecentIssueItem extends YouTrackTreeItem {
  constructor(
    public readonly issue: IssueEntity,
    public readonly command?: vscode.Command,
  ) {
    super(issue.idReadable || `#${issue.id}`, vscode.TreeItemCollapsibleState.None, command, "youtrack-issue")

    // Set description to show the issue summary
    this.description = issue.summary

    // Set tooltip to include summary
    this.tooltip = `${issue.idReadable}: ${issue.summary}`
  }
}
