/**
 * Editor commands for YouTrack content
 */
import * as vscode from "vscode"
import * as logger from "../../utils/logger"
import { FILE_TYPE_ARTICLE, FILE_TYPE_ISSUE, type YoutrackFilesService } from "../../services"
import type { IssueTreeItem } from "../issues/issues.tree-item"
import type { ArticleTreeItem } from "../articles/articles.tree-item"
import type { YoutrackFileTreeItem } from "./projects.tree-item"
import {
  COMMAND_EDIT_ISSUE,
  COMMAND_EDIT_ARTICLE,
  COMMAND_FETCH_FROM_YOUTRACK,
  COMMAND_SAVE_TO_YOUTRACK,
  COMMAND_UNLINK_FILE,
} from "./projects.consts"

/**
 * Register all editor commands
 * @param context Extension context
 * @param fileEditorService File editor service
 */
export function registerEditorCommands(
  context: vscode.ExtensionContext,
  fileEditorService: YoutrackFilesService,
): void {
  // Register issue editor command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_EDIT_ISSUE, async (item: IssueTreeItem) => {
      try {
        if (!item) {
          const issueId = await vscode.window.showInputBox({
            prompt: "Enter YouTrack issue ID (e.g. PROJECT-123)",
            placeHolder: "PROJECT-123",
          })

          if (!issueId) {
            return
          }

          await fileEditorService.openInEditor(issueId, FILE_TYPE_ISSUE)
        } else {
          await fileEditorService.openInEditor(item.issue.id, FILE_TYPE_ISSUE)
        }
      } catch (error) {
        logger.error(`Error opening issue in editor: ${error}`)
        vscode.window.showErrorMessage(`Failed to open issue in editor: ${error}`)
      }
    }),
  )

  // Register article editor command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_EDIT_ARTICLE, async (item: ArticleTreeItem) => {
      try {
        if (!item) {
          const articleId = await vscode.window.showInputBox({
            prompt: "Enter YouTrack article ID",
            placeHolder: "Enter article ID",
          })

          if (!articleId) {
            return
          }

          await fileEditorService.openInEditor(articleId, FILE_TYPE_ARTICLE)
        } else {
          await fileEditorService.openInEditor(item.article.id, FILE_TYPE_ARTICLE)
        }
      } catch (error) {
        logger.error(`Error opening article in editor: ${error}`)
        vscode.window.showErrorMessage(`Failed to open article in editor: ${error}`)
      }
    }),
  )

  // Register fetch from YouTrack command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_FETCH_FROM_YOUTRACK, async () => {
      try {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
          vscode.window.showWarningMessage("No active editor found")
          return
        }

        // Get the file data for the current document
        const filePath = editor.document.uri.fsPath
        const allFiles = fileEditorService.getEditedFiles()
        const fileData = allFiles.find((file) => file.filePath === filePath)

        if (!fileData) {
          vscode.window.showWarningMessage("Current file is not linked to YouTrack")
          return
        }

        await fileEditorService.fetchFromYouTrack(fileData)
      } catch (error) {
        logger.error(`Error fetching from YouTrack: ${error}`)
        vscode.window.showErrorMessage(`Failed to fetch from YouTrack: ${error}`)
      }
    }),
  )

  // Register save to YouTrack command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_SAVE_TO_YOUTRACK, async () => {
      try {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
          vscode.window.showWarningMessage("No active editor found")
          return
        }

        // Get the file data for the current document
        const filePath = editor.document.uri.fsPath
        const allFiles = fileEditorService.getEditedFiles()
        const fileData = allFiles.find((file) => file.filePath === filePath)

        if (!fileData) {
          vscode.window.showWarningMessage("Current file is not linked to YouTrack")
          return
        }

        await fileEditorService.saveToYouTrack(fileData)
      } catch (error) {
        logger.error(`Error saving to YouTrack: ${error}`)
        vscode.window.showErrorMessage(`Failed to save to YouTrack: ${error}`)
      }
    }),
  )

  // Register unlink file command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_UNLINK_FILE,
      async (fileItem: { data: { fsPath: string } } | YoutrackFileTreeItem) => {
        try {
          let filePath: string | undefined

          // Handle different ways this command can be invoked
          if (fileItem) {
            // Called from tree view with YoutrackFileTreeItem
            if ("fileInfo" in fileItem) {
              const treeItem = fileItem as YoutrackFileTreeItem
              await fileEditorService.unlinkFile(treeItem.fileInfo)
              return
            }

            // Called with file path data
            if ("data" in fileItem && fileItem.data && "fsPath" in fileItem.data) {
              filePath = fileItem.data.fsPath
            }
          }

          // If no valid file item was provided, try to get from active editor
          if (!filePath) {
            const editor = vscode.window.activeTextEditor
            if (!editor) {
              vscode.window.showWarningMessage("No active editor or selected file found")
              return
            }
            filePath = editor.document.uri.fsPath
          }

          // Find the file data with the matching file path
          const allFiles = fileEditorService.getEditedFiles()
          const fileData = allFiles.find((file) => file.filePath === filePath)

          if (!fileData) {
            vscode.window.showWarningMessage("File is not linked to YouTrack")
            return
          }

          await fileEditorService.unlinkFile(fileData)
        } catch (error) {
          logger.error(`Error unlinking file: ${error}`)
          vscode.window.showErrorMessage(`Failed to unlink file: ${error}`)
        }
      },
    ),
  )
}
