import * as vscode from "vscode"
import { ConfigurationService } from "../services/configuration"
import { SettingsValidator } from "../utils/settings-validator"
import {
  CONFIG_INSTANCE_URL,
  CONFIG_TOKEN_STORAGE,
  CONFIG_TEMP_FOLDER_PATH,
  CONFIG_CACHE_TIMEOUT,
  CONFIG_RECENT_ITEMS_LIMIT,
  TOKEN_STORAGE_SECURE,
  TOKEN_STORAGE_SETTINGS,
} from "../constants"
import * as sinon from "sinon"

describe("ConfigurationService", () => {
  let configService: ConfigurationService
  let mockConfig: sinon.SinonStub
  let mockUpdate: sinon.SinonStub

  beforeEach(() => {
    // Reset all stubs
    mockUpdate = sinon.stub().resolves()
    mockConfig = sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        switch (key) {
          case CONFIG_INSTANCE_URL:
            return "https://youtrack.example.com"
          case CONFIG_TOKEN_STORAGE:
            return TOKEN_STORAGE_SECURE
          case CONFIG_TEMP_FOLDER_PATH:
            return ""
          case CONFIG_CACHE_TIMEOUT:
            return 300
          case CONFIG_RECENT_ITEMS_LIMIT:
            return 15
          default:
            return defaultValue
        }
      },
      update: mockUpdate,
    } as any)

    configService = new ConfigurationService()
  })

  afterEach(() => {
    sinon.restore()
  })

  it("should get instance URL from configuration", () => {
    const url = configService.getInstanceUrl()
    expect(url).toBe("https://youtrack.example.com")
    expect(mockConfig.calledOnce).toBeTruthy()
  })

  it("should update instance URL in configuration", async () => {
    await configService.setInstanceUrl("https://new.example.com")
    expect(
      mockUpdate.calledWith(CONFIG_INSTANCE_URL, "https://new.example.com", vscode.ConfigurationTarget.Global),
    ).toBeTruthy()
  })

  it("should get token storage method from configuration", () => {
    const storage = configService.getTokenStorage()
    expect(storage).toBe(TOKEN_STORAGE_SECURE)
  })

  it("should update token storage method in configuration", async () => {
    await configService.setTokenStorage(TOKEN_STORAGE_SETTINGS)
    expect(
      mockUpdate.calledWith(CONFIG_TOKEN_STORAGE, TOKEN_STORAGE_SETTINGS, vscode.ConfigurationTarget.Global),
    ).toBeTruthy()
  })

  it("should get temp folder path from configuration", () => {
    const path = configService.getTempFolderPath()
    expect(path).toContain("vscode-youtrack")
  })

  it("should update temp folder path in configuration", async () => {
    const testPath = "/test/path"
    await configService.setTempFolderPath(testPath)
    expect(mockUpdate.calledWith(CONFIG_TEMP_FOLDER_PATH, testPath, vscode.ConfigurationTarget.Global)).toBeTruthy()
  })

  it("should get cache timeout from configuration", () => {
    const timeout = configService.getCacheTimeout()
    expect(timeout).toBe(300)
  })

  it("should get recent items limit from configuration", () => {
    const limit = configService.getRecentItemsLimit()
    expect(limit).toBe(15)
  })

  it("should correctly determine if configuration is complete", () => {
    expect(configService.isConfigured()).toBeTruthy()

    // Mock empty URL case
    mockConfig.restore()
    mockConfig = sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        if (key === CONFIG_INSTANCE_URL) {
          return ""
        }
        return defaultValue
      },
      update: mockUpdate,
    } as any)

    expect(configService.isConfigured()).toBeFalsy()
  })
})

describe("SettingsValidator", () => {
  let configService: ConfigurationService
  let validator: SettingsValidator
  let showErrorMessage: sinon.SinonStub

  beforeEach(() => {
    sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        switch (key) {
          case CONFIG_INSTANCE_URL:
            return "https://youtrack.example.com"
          case CONFIG_TOKEN_STORAGE:
            return TOKEN_STORAGE_SECURE
          case CONFIG_TEMP_FOLDER_PATH:
            return ""
          case CONFIG_CACHE_TIMEOUT:
            return 300
          case CONFIG_RECENT_ITEMS_LIMIT:
            return 15
          default:
            return defaultValue
        }
      },
      update: sinon.stub().resolves(),
    } as any)

    configService = new ConfigurationService()
    validator = new SettingsValidator(configService)
    showErrorMessage = sinon.stub(vscode.window, "showErrorMessage")
  })

  afterEach(() => {
    sinon.restore()
  })

  it("should validate instance URL correctly", () => {
    expect(validator.validateInstanceUrl()).toBeTruthy()

    // Test with invalid URL
    sinon.restore()
    sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        if (key === CONFIG_INSTANCE_URL) {
          return "invalid-url"
        }
        return defaultValue
      },
    } as any)
    showErrorMessage = sinon.stub(vscode.window, "showErrorMessage")

    expect(validator.validateInstanceUrl()).toBeFalsy()
    expect(showErrorMessage.calledOnce).toBeTruthy()
  })

  it("should validate token storage correctly", () => {
    expect(validator.validateTokenStorage()).toBeTruthy()

    // Test with invalid token storage
    sinon.restore()
    sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        if (key === CONFIG_TOKEN_STORAGE) {
          return "invalid-storage"
        }
        return defaultValue
      },
    } as any)
    showErrorMessage = sinon.stub(vscode.window, "showErrorMessage")

    expect(validator.validateTokenStorage()).toBeFalsy()
    expect(showErrorMessage.calledOnce).toBeTruthy()
  })

  it("should validate recent items limit correctly", () => {
    expect(validator.validateRecentItemsLimit()).toBeTruthy()

    // Test with invalid limit
    sinon.restore()
    sinon.stub(vscode.workspace, "getConfiguration").returns({
      get: (key: string, defaultValue: unknown) => {
        if (key === CONFIG_RECENT_ITEMS_LIMIT) {
          return -1
        }
        return defaultValue
      },
    } as any)
    showErrorMessage = sinon.stub(vscode.window, "showErrorMessage")

    expect(validator.validateRecentItemsLimit()).toBeFalsy()
    expect(showErrorMessage.calledOnce).toBeTruthy()
  })

  it("should validate all settings correctly", () => {
    // Mock validateAll method to test all validations
    const validateInstanceUrlSpy = sinon.spy(validator, "validateInstanceUrl")
    const validateTokenStorageSpy = sinon.spy(validator, "validateTokenStorage")
    const validateTempFolderSpy = sinon.spy(validator, "validateTempFolder")
    const validateCacheTimeoutSpy = sinon.spy(validator, "validateCacheTimeout")
    const validateRecentItemsLimitSpy = sinon.spy(validator, "validateRecentItemsLimit")

    validator.validateAll()

    expect(validateInstanceUrlSpy.calledOnce).toBeTruthy()
    expect(validateTokenStorageSpy.calledOnce).toBeTruthy()
    expect(validateTempFolderSpy.calledOnce).toBeTruthy()
    expect(validateCacheTimeoutSpy.calledOnce).toBeTruthy()
    expect(validateRecentItemsLimitSpy.calledOnce).toBeTruthy()
  })
})
