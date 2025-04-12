import * as assert from "node:assert"
import { AuthenticationService } from "../../services/authentication"
import {
  ENV_YOUTRACK_BASE_URL,
  ENV_YOUTRACK_TOKEN,
  AUTHENTICATED,
  AUTHENTICATION_FAILED,
  NOT_AUTHENTICATED,
} from "../../consts/vscode"
import * as dotenv from "dotenv"
import { VSCodeMock, VSCodeMockHelper } from "../helpers/vscode-mock"

// Load environment variables from .env file
dotenv.config()

// Check if we have YouTrack credentials for integration tests
const hasCredentials = !!process.env[ENV_YOUTRACK_TOKEN] && !!process.env[ENV_YOUTRACK_BASE_URL]

// Conditionally run tests only if credentials are available
const testRunner = hasCredentials ? describe : describe.skip

/**
 * This is an integration test for the authentication service
 * It requires real YouTrack credentials to be set in the environment
 */
testRunner("Authentication Service - Integration Tests", () => {
  // Services
  let authService: AuthenticationService

  // VS Code mock
  let vscodeMock: VSCodeMock

  beforeAll(async () => {
    if (!hasCredentials) {
      console.warn("⚠️ Skipping authentication tests - no valid credentials provided")
      return
    }

    // Initialize VSCodeMock with YouTrack test configuration
    vscodeMock = new VSCodeMock(
      VSCodeMockHelper.createYouTrackMockConfig({
        baseUrl: process.env[ENV_YOUTRACK_BASE_URL],
        // Don't initialize with token to test authentication
        token: "",
      }),
    )

    // Initialize the authentication service
    authService = new AuthenticationService(vscodeMock.extensionContext)
    await authService.initialize()
  })

  it("should authenticate with valid credentials", async () => {
    if (!hasCredentials) return

    // Test authentication with valid credentials
    const success = await authService.authenticate(
      process.env[ENV_YOUTRACK_BASE_URL] ?? "",
      process.env[ENV_YOUTRACK_TOKEN] ?? "",
    )

    assert.strictEqual(success, true, "Authentication should succeed with valid credentials")
    assert.strictEqual(authService.getAuthState(), AUTHENTICATED, "Should be in authenticated state")
    assert.ok(authService.getClient(), "Should have a valid YouTrack client")
  })

  it("should fail authentication with invalid credentials", async () => {
    if (!hasCredentials) return

    // Temporarily log out to test
    await authService.logout()

    // Test authentication with invalid credentials
    const success = await authService.authenticate(
      process.env[ENV_YOUTRACK_BASE_URL] ?? "",
      "invalid_token_for_testing",
    )

    assert.strictEqual(success, false, "Authentication should fail with invalid credentials")
    assert.strictEqual(authService.getAuthState(), AUTHENTICATION_FAILED, "Should be in failed state")
  })

  it("should logout and clear credentials", async () => {
    if (!hasCredentials) return

    // First authenticate to test logout
    await authService.authenticate(process.env[ENV_YOUTRACK_BASE_URL] ?? "", process.env[ENV_YOUTRACK_TOKEN] ?? "")

    // Test logout
    await authService.logout()

    assert.strictEqual(authService.getAuthState(), NOT_AUTHENTICATED, "Should be logged out")
    assert.strictEqual(authService.getClient(), null, "Client should be null after logout")

    // Verify credentials were cleared from storage
    const token = await vscodeMock.extensionContext.secrets.get("youtrack-token")
    assert.strictEqual(token, undefined, "Token should be removed from storage")
  })
})
