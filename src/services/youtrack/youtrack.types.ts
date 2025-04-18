import type { NOT_AUTHENTICATED, AUTHENTICATING, AUTHENTICATED, AUTHENTICATION_FAILED } from "./youtrack.consts"

/**
 * Authentication states for YouTrack connection
 */
export type AuthState =
  | typeof NOT_AUTHENTICATED
  | typeof AUTHENTICATING
  | typeof AUTHENTICATED
  | typeof AUTHENTICATION_FAILED
