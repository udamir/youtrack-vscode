import * as vscode from "vscode"
import { YouTrackTreeItem } from "../base"
import type {
  SearchRootCategory,
  ProjectEntity,
  SavedSearchEntity,
  SprintEntity,
  AgileBoardEntity,
} from "./searches.types"
import {
  COMMAND_SET_ISSUES_SOURCE,
  SEARCH_ASSIGNED_TO_ME,
  SEARCH_COMMENTED_BY_ME,
  SEARCH_FAVORITES,
  SEARCH_REPORTED_BY_ME,
  SEARCH_ROOT_BOARDS,
  SEARCH_ROOT_PROJECTS,
  SEARCH_ROOT_SEARCHES,
  SEARCH_ROOT_STANDARD,
} from "./searches.consts"

/**
 * Tree item representing a search root category (Projects, Saved Searches, or Agile Boards)
 */
export class SearchRootTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly categoryId: SearchRootCategory,
    public readonly label: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded,
  ) {
    super(label, collapsibleState, undefined, `root-${categoryId}`)

    // Set appropriate icon for each root category
    switch (categoryId) {
      case SEARCH_ROOT_PROJECTS:
        this.setThemeIcon("layers")
        break
      case SEARCH_ROOT_SEARCHES:
        this.setThemeIcon("search")
        break
      case SEARCH_ROOT_BOARDS:
        this.setThemeIcon("dashboard")
        break
      case SEARCH_ROOT_STANDARD:
        this.setThemeIcon("filter")
        break
      case SEARCH_ASSIGNED_TO_ME:
        this.setThemeIcon("user")
        break
      case SEARCH_COMMENTED_BY_ME:
        this.setThemeIcon("comment")
        break
      case SEARCH_REPORTED_BY_ME:
        this.setThemeIcon("new-file")
        break
      case SEARCH_FAVORITES:
        this.setThemeIcon("star-full")
        break
    }
  }
}

export class SearchStandardTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly categoryId: SearchRootCategory,
    public readonly label: string,
    public readonly isActive: boolean = false,
  ) {
    // Create command to select this item when clicked
    const command: vscode.Command = {
      command: COMMAND_SET_ISSUES_SOURCE,
      title: "Set as Active",
      arguments: [{ type: categoryId }],
    }

    super(label, vscode.TreeItemCollapsibleState.None, command, `source-${categoryId}`)

    this.setThemeIcon(isActive ? "circle-filled" : "circle-outline")
  }
}

export class SearchProjectTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly project: ProjectEntity,
    public readonly isActive: boolean = false,
  ) {
    // Create command to select this item when clicked
    const command: vscode.Command = {
      command: COMMAND_SET_ISSUES_SOURCE,
      title: "Set as Active",
      arguments: [{ type: "project", source: project }],
    }

    super(project.name, vscode.TreeItemCollapsibleState.None, command, "source-project")

    this.setThemeIcon(isActive ? "circle-filled" : "circle-outline")

    // Set tooltip for item
    this.tooltip = project.description
  }
}

export class SearchSavedSearchTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly savedSearch: SavedSearchEntity,
    public readonly isActive: boolean = false,
  ) {
    // Create command to select this item when clicked
    const command: vscode.Command = {
      command: COMMAND_SET_ISSUES_SOURCE,
      title: "Set as Active",
      arguments: [{ type: "search", source: savedSearch }],
    }

    super(savedSearch.name, vscode.TreeItemCollapsibleState.None, command, "source-search")

    this.setThemeIcon(isActive ? "circle-filled" : "circle-outline")
    // Set tooltip for item
    this.tooltip = savedSearch.query
  }
}

export class SearchSprintTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly sprint: SprintEntity,
    public readonly isActive: boolean = false,
  ) {
    // Create command to select this item when clicked
    const command: vscode.Command = {
      command: COMMAND_SET_ISSUES_SOURCE,
      title: "Set as Active",
      arguments: [{ type: "sprint", source: sprint }],
    }

    super(sprint.name, vscode.TreeItemCollapsibleState.None, command, "source-sprint")

    this.setThemeIcon(isActive ? "circle-filled" : "circle-outline")

    // Set tooltip for item
    this.tooltip = `${sprint.agile.name}: ${sprint.name}`
  }
}

export class SearchAgileTreeItem extends YouTrackTreeItem {
  constructor(
    public readonly board: AgileBoardEntity,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
  ) {
    super(board.name, collapsibleState, undefined, "source-board")

    this.setThemeIcon("graph")

    // Set tooltip for item
    this.tooltip = board.name
  }
}
