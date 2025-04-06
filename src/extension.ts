import * as vscode from 'vscode';
import { COMMAND_CONNECT } from './constants';
import * as logger from './utils/logger';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext): void {
  // Initialize logger
  logger.initializeLogger();
  logger.info('YouTrack integration extension is now active!');

  // Register the connect command
  const connectCommand = vscode.commands.registerCommand(COMMAND_CONNECT, async () => {
    vscode.window.showInformationMessage('Connecting to YouTrack...');
    // Connection implementation will be added in TASK-1.5
  });

  // Add command to the context subscriptions
  context.subscriptions.push(connectCommand);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
  logger.info('YouTrack integration extension is now deactivated!');
}
