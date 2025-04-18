import type * as vscode from "vscode"

/**
 * Icon configuration for tree items
 */
export interface TreeItemIconPath {
  light: string | vscode.Uri
  dark: string | vscode.Uri
}
