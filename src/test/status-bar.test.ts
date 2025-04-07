import { StatusBarService, StatusBarState, type StatusBarItemFactory } from "../services/status-bar"
import * as logger from "../utils/logger"
import { ThemeColor } from "./mocks/vscode"

// Import mocks before any other imports
jest.mock("vscode", () => require("./mocks/vscode"), { virtual: true })

// Mock logger
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}))

// Create a mock status bar item
const mockStatusBarItem = {
  text: "",
  tooltip: "",
  backgroundColor: undefined as undefined | ThemeColor,
  command: undefined,
  show: jest.fn(),
  dispose: jest.fn(),
}

// Create a mock factory that returns our mock status bar item
const mockStatusBarFactory: StatusBarItemFactory = {
  createStatusBarItem: jest.fn().mockReturnValue(mockStatusBarItem),
}

describe("Status Bar Service", () => {
  let statusBarService: StatusBarService

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Reset status bar item state
    mockStatusBarItem.text = ""
    mockStatusBarItem.tooltip = ""
    mockStatusBarItem.backgroundColor = undefined
    mockStatusBarItem.command = undefined

    // Create instance of status bar service with our mock factory
    statusBarService = new StatusBarService(mockStatusBarFactory)
  })

  it("should initialize with NotAuthenticated state", () => {
    // Check status bar item was configured correctly
    expect(mockStatusBarItem.text).toBe("$(x) YouTrack")
    expect(mockStatusBarItem.tooltip).toBe("Not connected to YouTrack - Click to connect")
    expect(mockStatusBarItem.backgroundColor).toBeUndefined()

    // Verify that show was called
    expect(mockStatusBarItem.show).toHaveBeenCalled()

    // Verify logger was called
    expect(logger.info).toHaveBeenCalledWith("Status bar updated: not-authenticated")
  })

  it("should update status bar in Authenticated state", () => {
    // Update state to authenticated
    statusBarService.updateState(StatusBarState.Authenticated, "https://example.youtrack.cloud")

    // Check status bar item was updated correctly
    expect(mockStatusBarItem.text).toBe("$(check) YouTrack")
    expect(mockStatusBarItem.tooltip).toBe("Connected to YouTrack: https://example.youtrack.cloud")
    expect(mockStatusBarItem.backgroundColor).toBeUndefined()

    // Verify logger was called
    expect(logger.info).toHaveBeenCalledWith("Status bar updated: authenticated (https://example.youtrack.cloud)")
  })

  it("should update status bar in Error state", () => {
    // Update state to error
    statusBarService.updateState(StatusBarState.Error)

    // Check status bar item was updated correctly
    expect(mockStatusBarItem.text).toBe("$(alert) YouTrack")
    expect(mockStatusBarItem.tooltip).toBe("Error connecting to YouTrack - Click to reconnect")

    // Check theme color was used for background
    expect(mockStatusBarItem.backgroundColor).not.toBeUndefined()
    if (mockStatusBarItem.backgroundColor) {
      expect(mockStatusBarItem.backgroundColor).toBeInstanceOf(ThemeColor)
      expect(mockStatusBarItem.backgroundColor.id).toBe("statusBarItem.errorBackground")
    }

    // Verify logger was called
    expect(logger.info).toHaveBeenCalledWith("Status bar updated: error")
  })

  it("should dispose status bar item", () => {
    // Call dispose
    statusBarService.dispose()

    // Verify dispose was called on status bar item
    expect(mockStatusBarItem.dispose).toHaveBeenCalled()
  })
})
