/**
 * Base class for disposable resources
 */
import type * as vscode from "vscode"

/**
 * Base class for objects that need to be disposed when no longer used
 */
export abstract class Disposable implements vscode.Disposable {
  protected readonly _subscriptions: vscode.Disposable[] = []

  /**
   * Dispose all resources
   */
  public dispose(): void {
    for (const subscription of this._subscriptions) {
      subscription.dispose()
    }
  }
}
