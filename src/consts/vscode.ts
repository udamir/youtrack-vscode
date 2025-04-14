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
export const COMMAND_CONNECT = "youtrack.connect"
export const COMMAND_DISCONNECT = "youtrack.disconnect"
export const COMMAND_ADD_PROJECT = "youtrack.addProject"
export const COMMAND_REMOVE_PROJECT = "youtrack.removeProject"
export const COMMAND_SET_ACTIVE_PROJECT = "youtrack.setActiveProject"
export const COMMAND_REFRESH_PROJECTS = "youtrack.refreshProjects"
export const COMMAND_OPEN_ISSUE = "youtrack.openIssue"
export const COMMAND_OPEN_ARTICLE = "youtrack.openArticle"
export const COMMAND_FILTER_ISSUES = "youtrack.filterIssues"
export const COMMAND_TOGGLE_ISSUES_VIEW_MODE = "youtrack.toggleIssuesViewMode"
export const COMMAND_OPEN_INTERNAL_LINK = "youtrack.openInternalLink"
export const COMMAND_PREVIEW_ISSUE = "youtrack.previewIssue"
export const COMMAND_PREVIEW_ARTICLE = "youtrack.previewArticle"
export const COMMAND_REFRESH_ISSUES = "youtrack.refreshIssues"

// Maximum length for tab titles in the preview
export const MAX_TITLE_LENGTH = 30

// View IDs
export const VIEW_PROJECTS = "youtrackProjects"
export const VIEW_ISSUES = "youtrackIssues"
export const VIEW_KNOWLEDGE_BASE = "youtrackKnowledgeBase"
export const VIEW_RECENT_ISSUES = "youtrackRecentIssues"
export const VIEW_RECENT_ARTICLES = "youtrackRecentArticles"
export const VIEW_NOT_CONNECTED = "youtrackNotConnected"

// Context keys
export const CONTEXT_CONNECTED = "youtrack.status.connected"

// Cache keys
export const CACHE_SELECTED_PROJECTS = "selectedProjects"
export const CACHE_ACTIVE_PROJECT_ID = "activeProjectId"
export const CACHE_RECENT_ISSUES = "recentIssues"
export const CACHE_RECENT_ARTICLES = "recentArticles"
export const CACHE_ISSUES_VIEW_MODE = "issuesViewMode"

// Issue View Mode
export const ISSUE_VIEW_MODE_LIST = "list"
export const ISSUE_VIEW_MODE_TREE = "tree"

// Authentication states
export const NOT_AUTHENTICATED = "notAuthenticated"
export const AUTHENTICATING = "authenticating"
export const AUTHENTICATED = "authenticated"
export const AUTHENTICATION_FAILED = "authenticationFailed"
