import type * as vscode from "vscode"
import * as dotenv from "dotenv"
import * as path from "node:path"
import * as fs from "node:fs"

import {
  ENV_YOUTRACK_BASE_URL,
  ENV_YOUTRACK_TOKEN,
  VSCodeService,
  YoutrackFilesService,
  YouTrackService,
  CONFIG_TEMP_FOLDER_PATH,
} from "../../src/services"

// Load environment variables from .env file if it exists
dotenv.config()

// Get project root directory (assumes we're running from project root)
const PROJECT_ROOT = process.cwd()

// Create a temp directory in the project root for easier debugging and access
export const TEST_TEMP_DIR = path.join(PROJECT_ROOT, "temp")

// Ensure temp directory exists
if (!fs.existsSync(TEST_TEMP_DIR)) {
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true })
}

export const createYoutrackService = async () => {
  const baseUrl = process.env[ENV_YOUTRACK_BASE_URL]
  const token = process.env[ENV_YOUTRACK_TOKEN]

  if (!baseUrl || !token) {
    throw new Error("⚠️ Skipping knowledge base tests - no valid credentials provided")
  }
  const youtrackService = new YouTrackService()
  if (!(await youtrackService.authenticate(baseUrl, token))) {
    throw new Error("⚠️ Skipping knowledge base tests - authentication failed")
  }

  return youtrackService
}

export const createServices = async (context: vscode.ExtensionContext) => {
  const vscodeService = new VSCodeService(context)
  // Configure temp directory for file service
  vscodeService.config.update(CONFIG_TEMP_FOLDER_PATH, TEST_TEMP_DIR)

  const youtrackService = await createYoutrackService()

  const youtrackFilesService = new YoutrackFilesService(youtrackService, vscodeService)

  return { youtrackService, vscodeService, youtrackFilesService }
}
