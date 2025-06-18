import type * as vscode from "vscode"
import { jest } from "bun:test"

export class MockMemento implements vscode.Memento {
  private storage: Record<string, any> = {}

  get(key: string, defaultValue?: any) {
    return key in this.storage ? this.storage[key] : defaultValue
  }
  update(key: string, value: any) {
    this.storage[key] = value
    return Promise.resolve()
  }
  keys() {
    return Object.keys(this.storage)
  }
  setKeysForSync = jest.fn()
}

export class MockSecretStorage implements vscode.SecretStorage {
  private secrets: Record<string, string> = {}
  private changeEmitter = new MockEventEmitter<{ key: string }>()

  get(key: string) {
    return Promise.resolve(this.secrets[key])
  }
  store(key: string, value: string) {
    this.secrets[key] = value
    this.changeEmitter.fire({ key })
    return Promise.resolve()
  }
  delete(key: string) {
    delete this.secrets[key]
    this.changeEmitter.fire({ key })
    return Promise.resolve()
  }
  onDidChange = this.changeEmitter.event
}

export class MockGlobalEnvironmentVariableCollection implements vscode.GlobalEnvironmentVariableCollection {
  [Symbol.iterator](): Iterator<[variable: string, mutator: vscode.EnvironmentVariableMutator], any, any> {
    return {
      next: jest.fn(),
    }
  }
  persistent = false
  description: string | vscode.MarkdownString | undefined = undefined
  replace = jest.fn()
  append = jest.fn()
  prepend = jest.fn()
  get = jest.fn()
  delete = jest.fn()
  forEach = jest.fn()
  clear = jest.fn()
  getScoped = jest.fn()
}

export class MockExtensionContext implements vscode.ExtensionContext {
  storagePath: string | undefined
  globalStoragePath: string
  logPath: string
  extension: vscode.Extension<any>
  languageModelAccessInformation: vscode.LanguageModelAccessInformation
  subscriptions: vscode.Disposable[] = []
  workspaceState: vscode.Memento = new MockMemento()
  globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void } = new MockMemento()
  secrets: vscode.SecretStorage = new MockSecretStorage()
  extensionPath = "/mock/extension/path"
  extensionUri: vscode.Uri = MockUri.file(this.extensionPath)
  asAbsolutePath: (relativePath: string) => string = (relativePath: string) => `${this.extensionPath}/${relativePath}`
  storageUri: vscode.Uri = MockUri.file(`${this.extensionPath}/storage`)
  globalStorageUri: vscode.Uri = MockUri.file(`${this.extensionPath}/globalStorage`)
  logUri: vscode.Uri = MockUri.file(`${this.extensionPath}/logs`)
  extensionMode: vscode.ExtensionMode = 3
  environmentVariableCollection = new MockGlobalEnvironmentVariableCollection()
}

export class MockTreeItem {
  label: string
  collapsibleState: number
  tooltip?: string
  contextValue?: string
  iconPath?: MockThemeIcon
  command?: {
    title: string
    command: string
    arguments?: any[]
  }

  constructor(label: string, collapsibleState: number) {
    this.label = label
    this.collapsibleState = collapsibleState
  }
}

/**
 * Simple EventEmitter implementation for testing
 */
export class MockEventEmitter<T = any> {
  private listeners: ((e: T) => any)[] = []
  public event = (listener: (e: T) => any) => {
    this.listeners.push(listener)
    return { dispose: () => {} }
  }
  public fire(data: T) {
    for (const l of this.listeners) l(data)
  }
  public dispose() {
    this.listeners = []
  }
}

export class MockDisposable {
  dispose() {}
}

export enum MockStatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum MockTreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class MockFileSystemWatcher {
  onDidChange = new MockEventEmitter<any>().event
  onDidCreate = new MockEventEmitter<any>().event
  onDidDelete = new MockEventEmitter<any>().event
  dispose() {}
}

class MockStatusBarItem implements vscode.StatusBarItem {
  id: string
  alignment: vscode.StatusBarAlignment
  priority: number | undefined
  name: string | undefined
  color: string | undefined
  backgroundColor: vscode.ThemeColor | undefined
  accessibilityInformation: vscode.AccessibilityInformation | undefined
  show: jest.Mock
  hide: jest.Mock
  dispose: jest.Mock
  text: string
  tooltip: string | undefined
  command: any
}

export class MockOutputChannel implements vscode.OutputChannel {
  name: string
  append: jest.Mock
  appendLine: jest.Mock
  clear: jest.Mock
  dispose: jest.Mock
  show: jest.Mock
  hide: jest.Mock
  replace: jest.Mock
}

class MockTreeView implements vscode.TreeView<MockTreeItem> {
  message?: string | undefined
  title?: string | undefined
  description?: string | undefined
  badge?: vscode.ViewBadge | undefined
  reveal = jest.fn()
  onDidChangeVisibility: vscode.Event<vscode.TreeViewVisibilityChangeEvent>
  onDidChangeSelection: vscode.Event<vscode.TreeViewSelectionChangeEvent<MockTreeItem>>
  onDidExpandElement: vscode.Event<vscode.TreeViewExpansionEvent<MockTreeItem>>
  onDidCollapseElement: vscode.Event<vscode.TreeViewExpansionEvent<MockTreeItem>>
  onDidChangeCheckboxState: vscode.Event<vscode.TreeCheckboxChangeEvent<MockTreeItem>>
  selection: MockTreeItem[]
  visible: boolean
  treeDataProvider: vscode.TreeDataProvider<MockTreeItem>
  dispose: jest.Mock
}

export class MockUri implements vscode.Uri {
  scheme: string
  authority: string
  path: string
  query: string
  fragment: string
  fsPath: string

  constructor(fsPath: string) {
    this.scheme = "file"
    this.authority = ""
    this.path = fsPath
    this.query = ""
    this.fragment = ""
    this.fsPath = fsPath
  }

  with(change: any): MockUri {
    return new MockUri(this.fsPath)
  }

  toString() {
    return this.fsPath
  }

  toJSON() {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
      fsPath: this.fsPath,
    }
  }

  static file(path: string): MockUri {
    return new MockUri(path)
  }

  static parse(uri: string): MockUri {
    if (uri.startsWith("file:")) {
      return new MockUri(uri.replace("file://", ""))
    }
    // Handle other URI types as needed
    return new MockUri(uri)
  }

  static joinPath(uri: MockUri, ...pathSegments: string[]): MockUri {
    const joinedPath = [uri.path, ...pathSegments].join("/")
    return new MockUri(joinedPath)
  }

  static isUri(thing: any): thing is MockUri {
    return thing instanceof MockUri
  }
}

export class MockThemeIcon implements vscode.ThemeIcon {
  id: string
  color?: vscode.ThemeColor

  constructor(id: string, color?: vscode.ThemeColor) {
    this.id = id
    this.color = color
  }

  static readonly File = new MockThemeIcon("file")
  static readonly Folder = new MockThemeIcon("folder")
  static readonly Account = new MockThemeIcon("account")
  static readonly Issues = new MockThemeIcon("issues")
  static readonly Error = new MockThemeIcon("error")
  static readonly Warning = new MockThemeIcon("warning")
  static readonly Info = new MockThemeIcon("info")
}

// --- Workspace mock class ---
export class WorkspaceMock {
  private config: Record<string, any>

  constructor() {
    this.config = {}
  }

  getConfiguration(): MockWorkspaceConfiguration {
    return new MockWorkspaceConfiguration(this.config)
  }

  // Mock methods
  updateWorkspaceFolders = jest.fn().mockReturnValue(true)
  onDidChangeWorkspaceFolders = jest.fn().mockReturnValue({ dispose: jest.fn() })
  createFileSystemWatcher = jest.fn().mockReturnValue({
    onDidChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidCreate: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidDelete: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    dispose: jest.fn(),
  })
  onDidChangeTextDocument = jest.fn().mockReturnValue({ dispose: jest.fn() })
  onDidCreateFiles = jest.fn().mockReturnValue({ dispose: jest.fn() })
  onDidDeleteFiles = jest.fn().mockReturnValue({ dispose: jest.fn() })
  onDidRenameFiles = jest.fn().mockReturnValue({ dispose: jest.fn() })
  onDidChangeConfiguration = jest.fn().mockReturnValue({ dispose: jest.fn() })
  saveAll = jest.fn().mockResolvedValue(true)
  applyEdit = jest.fn().mockResolvedValue(true)
}

/**
 * Mock implementation of VSCode Workspace Configuration
 */
export class MockWorkspaceConfiguration implements vscode.WorkspaceConfiguration {
  private configData: Record<string, any>

  constructor(configData: Record<string, any> = {}) {
    this.configData = configData
  }

  get<T>(section: string, defaultValue?: T): T {
    return section in this.configData ? this.configData[section] : (defaultValue as T)
  }

  has(section: string): boolean {
    return section in this.configData
  }

  inspect<T>(section: string):
    | {
        key: string
        defaultValue?: T
        globalValue?: T
        workspaceValue?: T
        workspaceFolderValue?: T
      }
    | undefined {
    if (!(section in this.configData)) {
      return undefined
    }

    return {
      key: section,
      defaultValue: undefined,
      globalValue: this.configData[section],
      workspaceValue: this.configData[section],
      workspaceFolderValue: undefined,
    }
  }

  update(
    section: string,
    value: any,
    configurationTarget?: boolean | vscode.ConfigurationTarget,
    overrideInLanguage?: boolean,
  ): Thenable<void> {
    this.configData[section] = value
    return Promise.resolve()
  }
}

// --- VSCode mock ---
export class VSCodeMock {
  private config: Record<string, any> = {}
  private configEmitter = new MockEventEmitter<any>()

  static createMockVSCodeApi() {
    const mock = new VSCodeMock()
    return {
      workspace: new WorkspaceMock(),
      window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        showQuickPick: jest.fn(),
        createOutputChannel: jest.fn().mockReturnValue({
          appendLine: jest.fn(),
          clear: jest.fn(),
          show: jest.fn(),
          dispose: jest.fn(),
        }),
        createTreeView: jest.fn().mockReturnValue({
          onDidChangeSelection: jest.fn(),
          onDidExpandElement: jest.fn(),
          onDidCollapseElement: jest.fn(),
          dispose: jest.fn(),
          reveal: jest.fn(),
        }),
        showTextDocument: jest.fn(),
        createStatusBarItem: jest.fn().mockReturnValue(new MockStatusBarItem()),
        onDidChangeActiveTextEditor: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        registerFileDecorationProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      },
      commands: {
        registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        executeCommand: jest.fn().mockResolvedValue(undefined),
      },
      Uri: MockUri,
      EventEmitter: MockEventEmitter,
      Disposable: MockDisposable,
      ThemeIcon: MockThemeIcon,
      TreeItem: MockTreeItem,
      TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
      },
      StatusBarAlignment: {
        Left: 1,
        Right: 2,
      },
      ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3,
      },
    }
  }
}
