/**
 * Constants used throughout the extension
 */

// String constants used throughout the extension
export const EXTENSION_NAME = "youtrack-vscode"
export const EXTENSION_DISPLAY_NAME = "YouTrack Integration"

// View container IDs
export const VIEW_CONTAINER_YOUTRACK = "youtrack-explorer"

// Configuration keys
export const CONFIG_INSTANCE_URL = "youtrack.instanceUrl"
export const CONFIG_TOKEN_STORAGE = "youtrack.tokenStorage"
export const CONFIG_TEMP_FOLDER_PATH = "youtrack.tempFolderPath"
export const CONFIG_CACHE_TIMEOUT = "youtrack.cacheTimeout"
export const CONFIG_RECENT_ITEMS_LIMIT = "youtrack.recentItemsLimit"

// Token storage options
export const TOKEN_STORAGE_SECURE = "secure"
export const TOKEN_STORAGE_SETTINGS = "settings"

// Storage keys
export const SECURE_STORAGE_KEY_TOKEN = "youtrack-token"
export const SECURE_STORAGE_KEY_BASE_URL = "youtrack-base-url"

// Environment variable names
export const ENV_YOUTRACK_BASE_URL = "YOUTRACK_BASE_URL"
export const ENV_YOUTRACK_TOKEN = "YOUTRACK_TOKEN"

// Status to control view visibility
export const STATUS_CONNECTED = "youtrack.status.connected"

// Command IDs
export const COMMAND_DISCONNECT = "youtrack.disconnect"

// Context keys
export const CONTEXT_CONNECTED = "youtrack.status.connected"

// Cache keys
export const CACHE_RECENT_ISSUES = "recentIssues"
export const CACHE_RECENT_ARTICLES = "recentArticles"
