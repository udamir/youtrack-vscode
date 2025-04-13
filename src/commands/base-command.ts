import * as vscode from "vscode"
import * as logger from "../utils/logger"

/**
 * Base interface for all command handlers
 */
export interface CommandHandler {
  /**
   * Execute the command
   */
  execute(...args: any[]): Promise<any>
}

/**
 * Base class for all command handlers
 */
export abstract class BaseCommandHandler implements CommandHandler {
  /**
   * Display an error message and log the error
   */
  protected handleError(message: string, error: any): void {
    logger.error(message, error)
    vscode.window.showErrorMessage(`${message}. See output log for details.`)
  }

  /**
   * Abstract execute method to be implemented by subclasses
   */
  abstract execute(...args: any[]): Promise<any>
}

/**
 * Register a command with VS Code
 */
export function registerCommand(context: vscode.ExtensionContext, command: string, handler: CommandHandler): void {
  const disposable = vscode.commands.registerCommand(command, async (...args: any[]) => {
    return handler.execute(...args)
  })
  context.subscriptions.push(disposable)
}
