import * as vscode from "vscode"
import { EXTENSION_DISPLAY_NAME } from "../services/vscode/vscode.consts"

/**
 * Logger functions for the extension
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
}

const outputChannel: { channel: vscode.OutputChannel | undefined } = {
  channel: undefined,
}

let logLevel: LogLevel = LogLevel.DEBUG

/**
 * Initialize the logger
 */
export function initializeLogger(context: vscode.ExtensionContext): void {
  outputChannel.channel = vscode.window.createOutputChannel(EXTENSION_DISPLAY_NAME)

  // Set default log level to DEBUG during development
  setLogLevel(LogLevel.DEBUG)
  debug("Debug logging enabled by default")

  // Subscribe to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("youtrack-vscode.logLevel")) {
        const configuration = vscode.workspace.getConfiguration("youtrack-vscode")
        const configLogLevel = configuration.get<string>("logLevel")

        if (configLogLevel) {
          const level = LogLevel[configLogLevel.toUpperCase() as keyof typeof LogLevel]
          if (level !== undefined) {
            setLogLevel(level)
          }
        }
      }
    }),
  )

  const configuration = vscode.workspace.getConfiguration("youtrack-vscode")
  const configLogLevel = configuration.get<string>("logLevel")

  if (configLogLevel) {
    const level = LogLevel[configLogLevel.toUpperCase() as keyof typeof LogLevel]
    if (level !== undefined) {
      setLogLevel(level)
      debug(`Log level set from configuration to ${LogLevel[level]}`)
    }
  }
}

/**
 * Set the log level
 * @param level The log level to set
 */
export function setLogLevel(level: LogLevel): void {
  logLevel = level
  info(`Log level set to ${LogLevel[level]}`)
}

/**
 * Log an informational message
 * @param message The message to log
 */
export function info(message: string): void {
  log(`INFO: ${message}`)
}

/**
 * Log a warning message
 * @param message The message to log
 */
export function warn(message: string): void {
  log(`WARNING: ${message}`)
}

/**
 * Log an error message
 * @param message The message to log
 * @param error Optional error object
 */
export function error(message: string, error?: unknown): void {
  if (error instanceof Error) {
    log(`ERROR: ${message} - ${error.message}`)
    if (error.stack) {
      log(error.stack)
    }
  } else {
    log(`ERROR: ${message}`)
  }
}

/**
 * Log a debug message
 * @param message The message to log
 */
export function debug(message: string): void {
  if (logLevel <= LogLevel.DEBUG) {
    log(`DEBUG: ${message}`)
  }
}

/**
 * Internal function to log a message with timestamp
 * @param message The message to log
 */
function log(message: string): void {
  if (!outputChannel.channel) {
    return
  }

  const timestamp = new Date().toISOString()
  outputChannel.channel.appendLine(`[${timestamp}] ${message}`)
}
