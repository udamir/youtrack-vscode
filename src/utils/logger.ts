import * as vscode from 'vscode';
import { EXTENSION_DISPLAY_NAME } from '../constants';

/**
 * Logger functions for the extension
 */
const outputChannel: { channel: vscode.OutputChannel | undefined } = { channel: undefined };

/**
 * Initialize the logger
 */
export function initializeLogger(): void {
  outputChannel.channel = vscode.window.createOutputChannel(EXTENSION_DISPLAY_NAME);
}

/**
 * Log an informational message
 * @param message The message to log
 */
export function info(message: string): void {
  log(`INFO: ${message}`);
}

/**
 * Log a warning message
 * @param message The message to log
 */
export function warn(message: string): void {
  log(`WARNING: ${message}`);
}

/**
 * Log an error message
 * @param message The message to log
 * @param error Optional error object
 */
export function error(message: string, error?: unknown): void {
  if (error instanceof Error) {
    log(`ERROR: ${message} - ${error.message}`);
    if (error.stack) {
      log(error.stack);
    }
  } else {
    log(`ERROR: ${message}`);
  }
}

/**
 * Log a debug message
 * @param message The message to log
 */
export function debug(message: string): void {
  // Only log debug messages in development mode
  if (process.env.NODE_ENV === 'development') {
    log(`DEBUG: ${message}`);
  }
}

/**
 * Internal function to log a message with timestamp
 * @param message The message to log
 */
function log(message: string): void {
  if (!outputChannel.channel) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  outputChannel.channel.appendLine(`[${timestamp}] ${message}`);
}
