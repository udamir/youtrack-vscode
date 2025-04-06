/**
 * Mock implementation of the VS Code API for testing
 */

export const window = {
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    show: jest.fn(),
  }),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn(),
}

export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn(),
    update: jest.fn(),
  }),
}

export const commands = {
  registerCommand: jest.fn(),
  getCommands: jest.fn().mockResolvedValue([]),
  executeCommand: jest.fn(),
}

export const extensions = {
  getExtension: jest.fn(),
}

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
}

export const ExtensionContext = jest.fn()
export const EventEmitter = jest.fn()
export const Extension = jest.fn()
export const OutputChannel = jest.fn()
