import * as assert from "node:assert"
import * as sinon from "sinon"
import type { ExtensionContext, SecretStorage } from "vscode"
import { SecureStorageService } from "../services/secure-storage"

type ExtensionState = {
  update: (key: string, value: unknown) => Thenable<void>
  get: <T>(key: string, defaultValue?: T) => T | undefined
}

describe("Secure Storage Service", () => {
  let secureStorage: SecureStorageService
  let mockContext: {
    secrets: Pick<SecretStorage, "store" | "get" | "delete">
    globalState: ExtensionState
  }
  let secretsStoreSpy: sinon.SinonSpy
  let secretsGetSpy: sinon.SinonSpy
  let secretsDeleteSpy: sinon.SinonSpy
  let globalStateUpdateSpy: sinon.SinonSpy
  let globalStateGetSpy: sinon.SinonSpy

  beforeEach(() => {
    // Create spies first
    secretsStoreSpy = sinon.fake.resolves(undefined)
    secretsGetSpy = sinon.fake.resolves("test-token")
    secretsDeleteSpy = sinon.fake.resolves(undefined)
    globalStateUpdateSpy = sinon.fake.resolves(undefined)
    globalStateGetSpy = sinon.fake.returns("https://example.youtrack.cloud")

    // Create mock context with spies
    mockContext = {
      secrets: {
        store: secretsStoreSpy,
        get: secretsGetSpy,
        delete: secretsDeleteSpy,
      },
      globalState: {
        update: globalStateUpdateSpy,
        get: globalStateGetSpy,
      } as unknown as ExtensionState,
    }

    // Create instance of secure storage service
    secureStorage = new SecureStorageService(mockContext as ExtensionContext)
  })

  afterEach(() => {
    sinon.restore()
  })

  it("should store token securely", async () => {
    const token = "test-token-123"
    await secureStorage.storeToken(token)

    assert.ok(secretsStoreSpy.calledOnce)
    assert.strictEqual(secretsStoreSpy.firstCall.args[0], "youtrack-token")
    assert.strictEqual(secretsStoreSpy.firstCall.args[1], token)
  })

  it("should retrieve stored token", async () => {
    const token = await secureStorage.getToken()

    assert.ok(secretsGetSpy.calledOnce)
    assert.strictEqual(secretsGetSpy.firstCall.args[0], "youtrack-token")
    assert.strictEqual(token, "test-token")
  })

  it("should store base URL", async () => {
    const url = "https://example.youtrack.cloud"
    await secureStorage.storeBaseUrl(url)

    assert.ok(globalStateUpdateSpy.calledOnce)
    assert.strictEqual(globalStateUpdateSpy.firstCall.args[0], "youtrack-base-url")
    assert.strictEqual(globalStateUpdateSpy.firstCall.args[1], url)
  })

  it("should retrieve stored base URL", () => {
    const url = secureStorage.getBaseUrl()

    assert.ok(globalStateGetSpy.calledOnce)
    assert.strictEqual(globalStateGetSpy.firstCall.args[0], "youtrack-base-url")
    assert.strictEqual(url, "https://example.youtrack.cloud")
  })

  it("should clear all credentials", async () => {
    await secureStorage.clearCredentials()

    assert.ok(secretsDeleteSpy.calledOnce)
    assert.strictEqual(secretsDeleteSpy.firstCall.args[0], "youtrack-token")

    assert.ok(globalStateUpdateSpy.calledOnce)
    assert.strictEqual(globalStateUpdateSpy.firstCall.args[0], "youtrack-base-url")
    assert.strictEqual(globalStateUpdateSpy.firstCall.args[1], undefined)
  })

  it("should encrypt and decrypt data", () => {
    const sensitiveData = "secret-data-123"

    // Encrypt the data
    const encrypted = secureStorage.encryptData(sensitiveData)

    // Verify encrypted data is different from original
    assert.notStrictEqual(encrypted, sensitiveData)
    assert.ok(encrypted.includes(":")) // Should include IV separator

    // Decrypt the data
    const decrypted = secureStorage.decryptData(encrypted)

    // Verify we get the original data back
    assert.strictEqual(decrypted, sensitiveData)
  })
})
