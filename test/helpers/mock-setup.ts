import { MockEventEmitter } from "./vscode-mock"

// Mock the vscode module
jest.mock("vscode", () => {
  // Create a mock implementation of vscode module
  const vscodeMock = {
    // Mock EventEmitter implementation using our MockEventEmitter
    EventEmitter: jest.fn().mockImplementation(() => {
      return new MockEventEmitter()
    }),
    // Add other VS Code API components as needed
    Uri: {
      file: jest.fn((path: string) => ({ path, scheme: "file" })),
      parse: jest.fn((uri: string) => ({ toString: () => uri })),
    },
    // TreeItem class mock - needed for YouTrackTreeItem to extend
    TreeItem: class TreeItem {
      label: string
      collapsibleState: number
      command: any
      contextValue: string | undefined
      tooltip: string | undefined
      description: string | undefined
      iconPath: any
      resourceUri: any
      id: string | undefined

      constructor(label: string, collapsibleState: number) {
        this.label = label
        this.collapsibleState = collapsibleState
        this.command = undefined
        this.contextValue = undefined
        this.tooltip = undefined
        this.description = undefined
        this.iconPath = undefined
        this.resourceUri = undefined
        this.id = undefined
      }
    },
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    },
    ViewColumn: {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2,
      Three: 3,
    },
    window: {
      createOutputChannel: jest.fn().mockReturnValue({
        appendLine: jest.fn(),
        append: jest.fn(),
        clear: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
      }),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
      showWarningMessage: jest.fn(),
      showInputBox: jest.fn(),
      createTreeView: jest.fn().mockReturnValue({
        onDidChangeVisibility: jest.fn(),
        onDidChangeSelection: jest.fn(),
        reveal: jest.fn(),
        dispose: jest.fn(),
      }),
    },
    workspace: {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        has: jest.fn(),
      }),
    },
    commands: {
      registerCommand: jest.fn(),
      executeCommand: jest.fn(),
    },
    ThemeIcon: jest.fn().mockImplementation((id) => ({ id })),
  }

  // Return the mock vscode module
  return vscodeMock
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
