import * as vscode from "vscode"
import { BaseCommandHandler } from "./base-command"
import { COMMAND_ADD_PROJECT, COMMAND_REMOVE_PROJECT, COMMAND_SET_ACTIVE_PROJECT } from "../consts"
import type { YouTrackService } from "../services/youtrack-client"
import type { ProjectsTreeDataProvider } from "../views/projects-tree-view"
import * as logger from "../utils/logger"

/**
 * Handler for the Add Project command
 */
export class AddProjectCommandHandler extends BaseCommandHandler {
  constructor(
    private youtrackService: YouTrackService,
    private projectsProvider: ProjectsTreeDataProvider,
  ) {
    super()
  }

  /**
   * Execute the add project command
   */
  async execute(): Promise<void> {
    try {
      // Get all available projects from YouTrack
      const availableProjects = await this.youtrackService.getProjects()

      if (!availableProjects || availableProjects.length === 0) {
        vscode.window.showInformationMessage(
          "No projects available in YouTrack or you don't have access to any projects",
        )
        return
      }

      // Filter out already selected projects
      const unselectedProjects = availableProjects.filter(
        (project) => !this.projectsProvider.selectedProjects.some((selected) => selected.id === project.id),
      )

      if (unselectedProjects.length === 0) {
        vscode.window.showInformationMessage("All available projects have already been added")
        return
      }

      // Show project picker and let user select one to add
      const selected = await vscode.window.showQuickPick(
        unselectedProjects.map((p) => ({
          label: p.name,
          description: p.shortName,
          detail: p.description,
          project: p,
        })),
      )

      if (selected) {
        // Add the selected project
        this.projectsProvider.addProject(selected.project)
      }
    } catch (error) {
      this.handleError("Error adding project", error)
    }
  }
}

/**
 * Handler for the Remove Project command
 */
export class RemoveProjectCommandHandler extends BaseCommandHandler {
  constructor(private projectsProvider: ProjectsTreeDataProvider) {
    super()
  }

  /**
   * Execute the remove project command
   */
  async execute(item: any): Promise<void> {
    try {
      if (item?.project) {
        const projectId = item.project.id
        const projectName = item.project.name

        // Confirm deletion
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to remove project "${projectName}"?`,
          { modal: true },
          "Yes",
        )

        if (confirm === "Yes") {
          this.projectsProvider.removeProject(projectId)
          vscode.window.showInformationMessage(`Removed project: ${projectName}`)
        }
      }
    } catch (error) {
      this.handleError("Error removing project", error)
    }
  }
}

/**
 * Handler for the Set Active Project command
 */
export class SetActiveProjectCommandHandler extends BaseCommandHandler {
  constructor(private projectsProvider: ProjectsTreeDataProvider) {
    super()
  }

  /**
   * Execute the set active project command
   */
  async execute(item: any): Promise<void> {
    try {
      // Check if we have a valid item with project info
      if (!item) {
        logger.error("Error setting active project: No item received")
        return
      }

      // Extract project information based on the shape of the item
      let projectShortName: string | undefined
      let projectName: string | undefined

      if (item.project && typeof item.project === "object") {
        // Case: item is { project: Project }
        projectShortName = item.project.shortName
        projectName = item.project.name
      } else if (item.shortName && item.name) {
        // Case: item is directly a Project or ProjectTreeItem
        projectShortName = item.shortName
        projectName = item.name
      }

      if (projectShortName && projectName) {
        this.projectsProvider.setActiveProject(projectShortName)
        // Add debug logging to track command execution
        logger.info(`Active project set to: ${projectName} (${projectShortName})`)
      } else {
        logger.error("Error setting active project: Invalid project object received", item)
      }
    } catch (error) {
      this.handleError("Error setting active project", error)
    }
  }
}

/**
 * Register all project related commands
 */
export function registerProjectCommands(
  context: vscode.ExtensionContext,
  youtrackService: YouTrackService,
  projectsProvider: ProjectsTreeDataProvider,
): void {
  // Add project command
  const addProjectHandler = new AddProjectCommandHandler(youtrackService, projectsProvider)
  const addProjectDisposable = vscode.commands.registerCommand(
    COMMAND_ADD_PROJECT,
    addProjectHandler.execute.bind(addProjectHandler),
  )
  context.subscriptions.push(addProjectDisposable)

  // Remove project command
  const removeProjectHandler = new RemoveProjectCommandHandler(projectsProvider)
  const removeProjectDisposable = vscode.commands.registerCommand(
    COMMAND_REMOVE_PROJECT,
    removeProjectHandler.execute.bind(removeProjectHandler),
  )
  context.subscriptions.push(removeProjectDisposable)

  // Set active project command
  const setActiveProjectHandler = new SetActiveProjectCommandHandler(projectsProvider)
  const setActiveProjectDisposable = vscode.commands.registerCommand(
    COMMAND_SET_ACTIVE_PROJECT,
    setActiveProjectHandler.execute.bind(setActiveProjectHandler),
  )
  context.subscriptions.push(setActiveProjectDisposable)
}
