import * as assert from "node:assert"
import * as sinon from "sinon"
import type { ExtensionContext } from "vscode"
import { AuthState, AuthenticationService } from "../services/authentication"
import { SecureStorageService } from "../services/secure-storage"

// Mock the YouTrack client
jest.mock("youtrack-client", () => {
  return {
    YouTrack: {
      client: jest.fn().mockImplementation(() => ({
        Users: {
          getCurrentUserProfile: jest.fn().mockResolvedValue({
            login: "test-user",
            email: "test@example.com",
            fullName: "Test User",
          }),
        },
      })),
    },
  }
})

describe("Authentication Service", () => {
  let authService: AuthenticationService
  let mockContext: any
  let secureStorageGetTokenStub: sinon.SinonStub
  let secureStorageGetBaseUrlStub: sinon.SinonStub
  let secureStorageStoreTokenStub: sinon.SinonStub
  let secureStorageStoreBaseUrlStub: sinon.SinonStub
  let secureStorageClearCredentialsStub: sinon.SinonStub

  beforeEach(() => {
    // Create stubs for SecureStorageService
    secureStorageGetTokenStub = sinon.stub(SecureStorageService.prototype, "getToken")
    secureStorageGetBaseUrlStub = sinon.stub(SecureStorageService.prototype, "getBaseUrl")
    secureStorageStoreTokenStub = sinon.stub(SecureStorageService.prototype, "storeToken")
    secureStorageStoreBaseUrlStub = sinon.stub(SecureStorageService.prototype, "storeBaseUrl")
    secureStorageClearCredentialsStub = sinon.stub(SecureStorageService.prototype, "clearCredentials")

    // Prepare mock context
    mockContext = {
      secrets: {},
      globalState: {},
    }

    // Create instance of authentication service
    authService = new AuthenticationService(mockContext as ExtensionContext)
  })

  afterEach(() => {
    sinon.restore()
  })

  it("should start in NotAuthenticated state", () => {
    assert.strictEqual(authService.getAuthState(), AuthState.NotAuthenticated)
    assert.strictEqual(authService.isAuthenticated(), false)
  })

  it("should initialize with stored credentials successfully", async () => {
    // Setup stored credentials
    secureStorageGetTokenStub.resolves("test-token")
    secureStorageGetBaseUrlStub.returns("https://example.youtrack.cloud")

    // Initialize auth service
    const result = await authService.initialize()

    // Verify initialization was successful
    assert.strictEqual(result, true)
    assert.strictEqual(authService.getAuthState(), AuthState.Authenticated)
    assert.strictEqual(authService.isAuthenticated(), true)
    assert.strictEqual(authService.getBaseUrl(), "https://example.youtrack.cloud")
    assert.notStrictEqual(authService.getClient(), null)
  })

  it("should fail initialization with no credentials", async () => {
    // Setup no stored credentials
    secureStorageGetTokenStub.resolves(undefined)
    secureStorageGetBaseUrlStub.returns(undefined)

    // Initialize auth service
    const result = await authService.initialize()

    // Verify initialization failed
    assert.strictEqual(result, false)
    assert.strictEqual(authService.getAuthState(), AuthState.NotAuthenticated)
    assert.strictEqual(authService.isAuthenticated(), false)
    assert.strictEqual(authService.getClient(), null)
  })

  it("should authenticate with valid credentials", async () => {
    // Test authentication
    const result = await authService.authenticate("https://example.youtrack.cloud", "test-token")

    // Verify authentication was successful
    assert.strictEqual(result, true)
    assert.strictEqual(authService.getAuthState(), AuthState.Authenticated)
    assert.strictEqual(authService.isAuthenticated(), true)
    assert.strictEqual(authService.getBaseUrl(), "https://example.youtrack.cloud")
    assert.notStrictEqual(authService.getClient(), null)

    // Verify credentials were stored
    assert.ok(secureStorageStoreTokenStub.calledOnce)
    assert.ok(secureStorageStoreBaseUrlStub.calledOnce)
    assert.strictEqual(secureStorageStoreTokenStub.firstCall.args[0], "test-token")
    assert.strictEqual(secureStorageStoreBaseUrlStub.firstCall.args[0], "https://example.youtrack.cloud")
  })

  it("should notify listeners when auth state changes", async () => {
    // Setup listener
    const listenerSpy = sinon.spy()
    const unsubscribe = authService.onAuthStateChanged(listenerSpy)

    // Authenticate
    await authService.authenticate("https://example.youtrack.cloud", "test-token")

    // Verify listener was called twice (Authenticating -> Authenticated)
    assert.strictEqual(listenerSpy.callCount, 2)
    assert.strictEqual(listenerSpy.firstCall.args[0], AuthState.Authenticating)
    assert.strictEqual(listenerSpy.secondCall.args[0], AuthState.Authenticated)

    // Logout
    await authService.logout()

    // Verify listener was called again
    assert.strictEqual(listenerSpy.callCount, 3)
    assert.strictEqual(listenerSpy.thirdCall.args[0], AuthState.NotAuthenticated)

    // Test unsubscribe
    unsubscribe()
    await authService.authenticate("https://example.youtrack.cloud", "test-token")

    // Verify listener wasn't called after unsubscribing
    assert.strictEqual(listenerSpy.callCount, 3)
  })

  it("should logout and clear credentials", async () => {
    // First authenticate
    await authService.authenticate("https://example.youtrack.cloud", "test-token")
    assert.strictEqual(authService.isAuthenticated(), true)

    // Then logout
    await authService.logout()

    // Verify logout was successful
    assert.strictEqual(authService.getAuthState(), AuthState.NotAuthenticated)
    assert.strictEqual(authService.isAuthenticated(), false)
    assert.strictEqual(authService.getClient(), null)
    assert.strictEqual(authService.getBaseUrl(), undefined)

    // Verify credentials were cleared
    assert.ok(secureStorageClearCredentialsStub.calledOnce)
  })
})
