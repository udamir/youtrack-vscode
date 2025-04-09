/**
 * Mock implementation of the VS Code API for testing
 */

// Create a ThemeColor class for use in status bar
export class ThemeColor {
  constructor(public readonly id: string) {}
}

// Status bar alignment enum
export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

// TreeItem collapsible state enum
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

// Uri class for file paths in tree items
export class Uri {
  static file(path: string): Uri {
    return new Uri(path)
  }

  constructor(public readonly path: string) {}
}

// ThemeIcon class for tree items
export class ThemeIcon {
  constructor(public readonly id: string) {}
}

// TreeItem class for tree views
export class TreeItem {
  public label: string
  public collapsibleState: TreeItemCollapsibleState
  public iconPath?: ThemeIcon | { light: string | Uri; dark: string | Uri }
  public command?: Command
  public contextValue?: string
  public description?: string

  constructor(label: string, collapsibleState: TreeItemCollapsibleState) {
    this.label = label
    this.collapsibleState = collapsibleState
  }
}

// Mock window namespace
export const window = {
  createStatusBarItem: jest.fn().mockImplementation((_alignment?: StatusBarAlignment, _priority?: number) => ({
    text: "",
    tooltip: "",
    backgroundColor: undefined,
    command: undefined,
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    append: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  }),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn(),
}

// Mock workspace namespace
export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn(),
    update: jest.fn(),
  }),
}

// Mock commands namespace
export const commands = {
  registerCommand: jest.fn(),
  getCommands: jest.fn().mockResolvedValue([]),
  executeCommand: jest.fn(),
}

// Mock extensions namespace
export const extensions = {
  getExtension: jest.fn(),
}

// Mock configuration targets
export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
}

// Mock classes and interfaces
export const ExtensionContext = {
  subscriptions: [],
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  secrets: {
    get: jest.fn(),
    store: jest.fn(),
    delete: jest.fn(),
  },
}

// Mock Command interface
export interface Command {
  title: string
  command: string
  tooltip?: string
}

export const EventEmitter = jest.fn()
export const Extension = jest.fn()
export const OutputChannel = jest.fn()
