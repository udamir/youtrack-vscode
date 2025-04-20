import type { STATUS_AUTHENTICATED, STATUS_NOT_AUTHENTICATED, STATUS_ERROR } from "./vscode.consts"

/**
 * Connection status
 */
export type ConnectionStatus = typeof STATUS_AUTHENTICATED | typeof STATUS_NOT_AUTHENTICATED | typeof STATUS_ERROR
