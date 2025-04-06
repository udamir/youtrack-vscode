import * as assert from "node:assert"
import type { ExtensionContext } from "vscode"
import * as dotenv from "dotenv"

import { AuthState, AuthenticationService } from "../../services/authentication"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../../constants"

// Load environment variables from .env file
dotenv.config()

// Check if we have YouTrack credentials for integration tests
const hasCredentials = !!process.env[ENV_YOUTRACK_TOKEN] && !!process.env[ENV_YOUTRACK_BASE_URL]

// Conditionally run tests only if credentials are available
const testRunner = hasCredentials ? describe : describe.skip

testRunner("Authentication Service - Integration Tests", () => {
  let authService: AuthenticationService
  let mockContext: any

  // Store original env variables to restore them after tests
  const originalToken = process.env[ENV_YOUTRACK_TOKEN]
  const originalBaseUrl = process.env[ENV_YOUTRACK_BASE_URL]

  beforeEach(() => {
    // Prepare mock context that still uses real credentials
    mockContext = {
      secrets: {
        store: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockImplementation((key: string) => {
          if (key === "youtrack-token") {
            return Promise.resolve(process.env[ENV_YOUTRACK_TOKEN])
          }
          return Promise.resolve(undefined)
        }),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      globalState: {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockImplementation((key: string) => {
          if (key === "youtrack-base-url") {
            return process.env[ENV_YOUTRACK_BASE_URL]
          }
          return undefined
        }),
      },
    }

    // Create instance of authentication service
    authService = new AuthenticationService(mockContext as ExtensionContext)
  })

  afterAll(() => {
    // Restore original env variables
    process.env[ENV_YOUTRACK_TOKEN] = originalToken
    process.env[ENV_YOUTRACK_BASE_URL] = originalBaseUrl
  })

  it("should start in NotAuthenticated state", () => {
    assert.strictEqual(authService.getAuthState(), AuthState.NotAuthenticated)
    assert.strictEqual(authService.isAuthenticated(), false)
  })

  it("should initialize with stored credentials successfully", async () => {
    // Initialize auth service with real credentials from environment
    const result = await authService.initialize()

    // Verify initialization was successful
    assert.strictEqual(result, true)
    assert.strictEqual(authService.getAuthState(), AuthState.Authenticated)
    assert.strictEqual(authService.isAuthenticated(), true)
    assert.strictEqual(authService.getBaseUrl(), process.env[ENV_YOUTRACK_BASE_URL])
    assert.notStrictEqual(authService.getClient(), null)
  })

  it("should authenticate with valid credentials", async () => {
    const baseUrl = process.env[ENV_YOUTRACK_BASE_URL] as string
    const token = process.env[ENV_YOUTRACK_TOKEN] as string

    // Test authentication with real credentials
    const result = await authService.authenticate(baseUrl, token)

    // Verify authentication was successful
    assert.strictEqual(result, true)
    assert.strictEqual(authService.getAuthState(), AuthState.Authenticated)
    assert.strictEqual(authService.isAuthenticated(), true)
    assert.strictEqual(authService.getBaseUrl(), baseUrl)
    assert.notStrictEqual(authService.getClient(), null)
  })

  it("should fail authentication with invalid credentials", async () => {
    const baseUrl = process.env[ENV_YOUTRACK_BASE_URL] as string
    const invalidToken = "invalid-token"

    // Test authentication with invalid token
    const result = await authService.authenticate(baseUrl, invalidToken)

    // Verify authentication failed
    assert.strictEqual(result, false)
    assert.strictEqual(authService.getAuthState(), AuthState.AuthenticationFailed)
    assert.strictEqual(authService.isAuthenticated(), false)
  })

  it("should logout and clear credentials", async () => {
    // First authenticate
    const baseUrl = process.env[ENV_YOUTRACK_BASE_URL] as string
    const token = process.env[ENV_YOUTRACK_TOKEN] as string
    await authService.authenticate(baseUrl, token)

    // Then logout
    await authService.logout()

    // Verify logout was successful
    assert.strictEqual(authService.getAuthState(), AuthState.NotAuthenticated)
    assert.strictEqual(authService.isAuthenticated(), false)
    assert.strictEqual(authService.getClient(), null)
    assert.strictEqual(authService.getBaseUrl(), undefined)
  })
})
