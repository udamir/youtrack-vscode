import * as vscode from "vscode"
import { ISSUE_VIEW_MODE_LIST } from "../../src/views/issues"
import type { ProjectEntity } from "../../src/views"
import { ENV_YOUTRACK_BASE_URL, ENV_YOUTRACK_TOKEN } from "../../src/services"

/**
 * Simple EventEmitter implementation for testing
 */
export class MockEventEmitter<T> implements vscode.EventEmitter<T> {
  dispose(): void {
    this.listeners = []
  }

  private listeners: ((e: T) => any)[] = []

  get event() {
    return (listener: (e: T) => any) => {
      this.listeners.push(listener)
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener)
          if (index !== -1) {
            this.listeners.splice(index, 1)
          }
        },
      }
    }
  }

  fire(data: T): void {
    this.listeners.forEach((listener) => listener(data))
  }
}

/**
 * Helper functions to create mock VS Code objects for testing
 */
export namespace VSCodeMockHelper {
  /**
   * Creates a mock Memento (globalState or workspaceState) with initial values
   * @param initialValues The initial values to include in the memento
   * @returns A mock Memento implementation
   */
  export function createMockMemento(initialValues: Record<string, any> = {}): any {
    const storage = { ...initialValues }

    return {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        return key in storage ? storage[key] : defaultValue
      }),
      update: jest.fn().mockImplementation((key: string, value: any) => {
        storage[key] = value
        return Promise.resolve()
      }),
      keys: jest.fn().mockImplementation(() => {
        return Object.keys(storage)
      }),
      setKeysForSync: jest.fn(),
    }
  }

  /**
   * Creates a mock SecretStorage with initial values
   * @param initialSecrets The initial secret values to include
   * @returns A mock SecretStorage implementation
   */
  export function createMockSecretStorage(initialSecrets: Record<string, string> = {}): any {
    const secrets = { ...initialSecrets }
    const changeEmitter = new MockEventEmitter<{ key: string }>()

    return {
      get: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(secrets[key])
      }),
      store: jest.fn().mockImplementation((key: string, value: string) => {
        secrets[key] = value
        return Promise.resolve()
      }),
      delete: jest.fn().mockImplementation((key: string) => {
        delete secrets[key]
        return Promise.resolve()
      }),
      onDidChange: changeEmitter.event,
      _changeEmitter: changeEmitter, // For test access
    }
  }

  /**
   * Creates a mock VS Code extension context with customizable state
   * @param options Configuration options for the mock context
   * @returns A mock extension context object
   */
  export function createMockExtensionContext(
    options: {
      workspaceState?: Record<string, any>
      globalState?: Record<string, any>
      secrets?: Record<string, string>
      extensionPath?: string
    } = {},
  ): any {
    const workspaceState = createMockMemento(options.workspaceState || {})
    const globalState = createMockMemento(options.globalState || {})
    const secretStorage = createMockSecretStorage(options.secrets || {})
    const extensionPath = options.extensionPath || "/mock/extension/path"
    const extensionUri = vscode.Uri.file(extensionPath)

    return {
      subscriptions: [],
      workspaceState,
      globalState,
      extensionPath,
      extensionUri,
      asAbsolutePath: jest.fn().mockImplementation((relativePath) => {
        return `${extensionPath}/${relativePath}`
      }),
      storageUri: vscode.Uri.file(`${extensionPath}/storage`),
      globalStorageUri: vscode.Uri.file(`${extensionPath}/globalStorage`),
      logUri: vscode.Uri.file(`${extensionPath}/logs`),
      extensionMode: 3, // ExtensionMode.Test
      environmentVariableCollection: { persistent: false },
      secrets: secretStorage,
    }
  }

  /**
   * Creates a mock extension context specifically for YouTrack tests with common configurations
   * @param options Options for the YouTrack test context
   * @returns A properly configured extension context with YouTrack values
   */
  export function createYouTrackTestContext(
    options: {
      baseUrl?: string
      token?: string
      activeProjectId?: string
      selectedProjects?: ProjectEntity[]
      recentIssues?: any[]
      issuesViewMode?: string
    } = {},
  ): any {
    // Get values from options or environment variables
    const baseUrl = options.baseUrl || process.env[ENV_YOUTRACK_BASE_URL]
    const token = options.token || process.env[ENV_YOUTRACK_TOKEN]
    const activeProjectId = options.activeProjectId
    const selectedProjects = options.selectedProjects || []
    const recentIssues = options.recentIssues || []
    const issuesViewMode = options.issuesViewMode || ISSUE_VIEW_MODE_LIST

    // Create the global state with YouTrack-specific values
    const globalState = {
      "youtrack-base-url": baseUrl,
      "youtrack-active-project-id": activeProjectId,
      "youtrack-issues-view-mode": issuesViewMode,
    }

    // Create the workspace state with YouTrack-specific values
    const workspaceState = {
      "youtrack-selected-projects": selectedProjects,
      "youtrack-recent-issues": recentIssues,
    }

    // Create secrets storage with the YouTrack token (only if token exists)
    const secrets: Record<string, string> = {}
    if (token) {
      secrets["youtrack-token"] = token
    }

    // Create the extension context with all these values
    return createMockExtensionContext({
      globalState,
      workspaceState,
      secrets,
    })
  }

  /**
   * Creates an initialization configuration for VSCodeMock specifically for YouTrack tests
   * @param options Configuration options for the YouTrack test environment
   * @returns A VSCodeMock initialization configuration
   */
  export function createYouTrackMockConfig(
    options: {
      baseUrl?: string
      token?: string
      activeProjectId?: string
      selectedProjects?: ProjectEntity[]
      recentIssues?: any[]
      issuesViewMode?: string
      additionalConfig?: Record<string, any>
    } = {},
  ): {
    initialConfig: Record<string, any>
    extensionContext: any
  } {
    // Create the extension context
    const extensionContext = createYouTrackTestContext(options)

    // Create the configuration with YouTrack-specific values
    const initialConfig = {
      "youtrack.baseUrl": options.baseUrl || process.env[ENV_YOUTRACK_BASE_URL],
      "youtrack.tokenStorage": "secure",
      "youtrack.issuesViewMode": options.issuesViewMode || ISSUE_VIEW_MODE_LIST,
      ...options.additionalConfig,
    }

    return {
      initialConfig,
      extensionContext,
    }
  }
}

/**
 * Comprehensive mock implementation of VS Code API for E2E testing
 */
export class VSCodeMock {
  // Storage for registered commands
  private commands: Map<string, (...args: any[]) => any> = new Map()

  // Event emitters
  private readonly onDidChangeConfigurationEmitter = new MockEventEmitter<vscode.ConfigurationChangeEvent>()
  private readonly onDidChangeWorkspaceFoldersEmitter = new MockEventEmitter<vscode.WorkspaceFoldersChangeEvent>()
  private readonly onDidChangeTextDocumentEmitter = new MockEventEmitter<vscode.TextDocumentChangeEvent>()
  private readonly onDidOpenTextDocumentEmitter = new MockEventEmitter<vscode.TextDocument>()
  private readonly onDidCloseTextDocumentEmitter = new MockEventEmitter<vscode.TextDocument>()
  private readonly onDidChangeActiveTextEditorEmitter = new MockEventEmitter<vscode.TextEditor | undefined>()

  // Storage for configurations
  private configValues: Record<string, any> = {}
  private activeTextEditor: vscode.TextEditor | undefined
  private openTextDocuments: vscode.TextDocument[] = []
  private workspaceFolders: vscode.WorkspaceFolder[] = []
  private outputChannels: Map<string, MockOutputChannel> = new Map()
  private statusBarItems: MockStatusBarItem[] = []
  private treeViews: Map<string, MockTreeView<any>> = new Map()

  // Extension context
  public extensionContext: vscode.ExtensionContext

  constructor(
    options: {
      initialConfig?: Record<string, any>
      extensionContext?: Partial<vscode.ExtensionContext>
      workspaceFolders?: vscode.WorkspaceFolder[]
    } = {},
  ) {
    // Set initial configuration values
    this.configValues = options.initialConfig || {}

    // Set workspace folders
    this.workspaceFolders = options.workspaceFolders || []

    // Create extension context
    this.extensionContext = options.extensionContext
      ? ({ ...VSCodeMockHelper.createMockExtensionContext(), ...options.extensionContext } as vscode.ExtensionContext)
      : (VSCodeMockHelper.createMockExtensionContext() as vscode.ExtensionContext)
  }

  /**
   * Define the namespace for vscode elements
   */
  private static createVSCodeNamespace(): Record<string, any> {
    return {
      // ThemeColor implementation for styling
      ThemeColor: class {
        constructor(public id: string) {}
      },

      // Status bar alignment constants
      StatusBarAlignment: {
        Left: 1,
        Right: 2,
      },

      // Tree item collapse states
      TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2,
      },

      // Standard URI implementation used in VS Code
      Uri: {
        parse: (uri: string) => ({
          scheme: uri.split(":")[0],
          path: uri.split(":")[1],
          toString: () => uri,
        }),
        file: (path: string) => ({
          scheme: "file",
          path,
          toString: () => `file:${path}`,
        }),
      },

      // VS Code disposable API mocked implementation
      Disposable: {
        from: (...disposables: { dispose: () => any }[]) => ({
          dispose: () => {
            disposables.forEach((d) => d.dispose())
          },
        }),
      },
    }
  }

  /**
   * Create a mock implementation of the VS Code API
   */
  public createMockVSCodeApi(): typeof vscode {
    // Get the vscode namespace with constants
    const vsNamespace = VSCodeMock.createVSCodeNamespace()

    return {
      // Include the VS Code namespace constants
      ...vsNamespace,

      // Events emitters
      EventEmitter: MockEventEmitter,

      // Commands API
      commands: {
        registerCommand: jest.fn().mockImplementation((commandId: string, handler: (...args: any[]) => any) => {
          this.commands.set(commandId, handler)
          return {
            dispose: () => {
              this.commands.delete(commandId)
            },
          }
        }),
        executeCommand: jest.fn().mockImplementation((commandId: string, ...args: any[]) => {
          const handler = this.commands.get(commandId)
          if (handler) {
            return Promise.resolve(handler(...args))
          }
          return Promise.resolve(undefined)
        }),
        getCommands: jest.fn().mockImplementation(() => {
          return Promise.resolve(Array.from(this.commands.keys()))
        }),
      },

      // Window API
      window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        showQuickPick: jest.fn(),
        createTreeView: jest.fn().mockImplementation((viewId: string, options: vscode.TreeViewOptions<any>) => {
          const treeView = new MockTreeView(viewId, options)
          this.treeViews.set(viewId, treeView)
          return treeView
        }),
        createTextEditorDecorationType: jest.fn(),
        showTextDocument: jest.fn(),
        onDidChangeActiveTextEditor: this.onDidChangeActiveTextEditorEmitter.event,
        get activeTextEditor() {
          return this.activeTextEditor
        },
        set activeTextEditor(editor: vscode.TextEditor | undefined) {
          this.activeTextEditor = editor
          this.onDidChangeActiveTextEditorEmitter.fire(editor)
        },
        visibleTextEditors: [],
        terminals: [],
        createTerminal: jest.fn(),
        createOutputChannel: jest.fn().mockImplementation((name: string) => {
          const channel = new MockOutputChannel(name)
          this.outputChannels.set(name, channel)
          return channel
        }),
        createStatusBarItem: jest.fn().mockImplementation((alignment?: vscode.StatusBarAlignment, priority?: number) => {
          const item = new MockStatusBarItem(alignment || vscode.StatusBarAlignment.Left, priority || 0)
          this.statusBarItems.push(item)
          return item
        }),
        registerWebviewPanelSerializer: jest.fn(),
        registerTreeDataProvider: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        registerFileDecorationProvider: jest.fn().mockImplementation((provider: any) => ({
          dispose: jest.fn(),
        })),
        withProgress: jest.fn().mockImplementation(
          (_options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<any>) => {
            const progress = { report: jest.fn() }
            return task(progress)
          }
        ),
      },

      // Workspace API
      workspace: {
        getConfiguration: jest.fn().mockImplementation((section?: string) => {
          return {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const fullKey = section ? `${section}.${key}` : key
              return fullKey in this.configValues ? this.configValues[fullKey] : defaultValue
            }),
            update: jest.fn().mockImplementation((key: string, value: any, _target?: vscode.ConfigurationTarget) => {
              const fullKey = section ? `${section}.${key}` : key
              this.configValues[fullKey] = value
              this.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: (section) => section === fullKey })
              return Promise.resolve()
            }),
            has: jest.fn().mockImplementation((key: string) => {
              const fullKey = section ? `${section}.${key}` : key
              return fullKey in this.configValues
            }),
            inspect: jest.fn(),
          }
        }),
        onDidChangeConfiguration: this.onDidChangeConfigurationEmitter.event,
        workspaceFolders: this.workspaceFolders,
        onDidChangeWorkspaceFolders: this.onDidChangeWorkspaceFoldersEmitter.event,
        openTextDocument: jest.fn().mockImplementation((uri: vscode.Uri | string) => {
          const doc = new MockTextDocument(typeof uri === "string" ? uri : uri.fsPath)
          this.openTextDocuments.push(doc)
          this.onDidOpenTextDocumentEmitter.fire(doc)
          return Promise.resolve(doc)
        }),
        onDidOpenTextDocument: this.onDidOpenTextDocumentEmitter.event,
        onDidCloseTextDocument: this.onDidCloseTextDocumentEmitter.event,
        onDidChangeTextDocument: this.onDidChangeTextDocumentEmitter.event,
        textDocuments: this.openTextDocuments,
        fs: {
          readFile: jest.fn().mockImplementation((_uri: vscode.Uri) => {
            return Promise.resolve(Buffer.from(""))
          }),
          writeFile: jest.fn().mockImplementation((_uri: vscode.Uri, _content: Uint8Array) => {
            return Promise.resolve()
          }),
          delete: jest.fn().mockImplementation((_uri: vscode.Uri) => {
            return Promise.resolve()
          }),
          rename: jest.fn().mockImplementation((_source: vscode.Uri, _target: vscode.Uri) => {
            return Promise.resolve()
          }),
          stat: jest.fn().mockImplementation((_uri: vscode.Uri) => {
            return Promise.resolve({
              type: vscode.FileType.File,
              ctime: Date.now(),
              mtime: Date.now(),
              size: 0,
            })
          }),
          createDirectory: jest.fn().mockImplementation((_uri: vscode.Uri) => {
            return Promise.resolve()
          }),
          readDirectory: jest.fn().mockImplementation((_uri: vscode.Uri) => {
            return Promise.resolve([])
          }),
        },
      },

      // Extension API
      extensions: {
        getExtension: jest.fn().mockImplementation((_extensionId: string) => {
          return undefined // No extension by default
        }),
        all: [],
      },

      // Enums
      ConfigurationTarget: vscode.ConfigurationTarget,

      // Other parts of the API that might be needed can be added here
      Uri: vscode.Uri,
      MarkdownString: vscode.MarkdownString,
      ThemeIcon: vscode.ThemeIcon,
      Range: vscode.Range,
      Position: vscode.Position,
      Selection: vscode.Selection,

      // Additional mock helpers
      _mockHelper: this,
    } as unknown as typeof vscode
  }

  /**
   * Trigger a configuration change event
   */
  public triggerConfigurationChange(section: string): void {
    this.onDidChangeConfigurationEmitter.fire({
      affectsConfiguration: (_section) => section === _section,
    })
  }

  /**
   * Set a configuration value
   */
  public setConfigurationValue(section: string, key: string, value: any): void {
    const fullKey = `${section}.${key}`
    this.configValues[fullKey] = value
  }

  /**
   * Execute a registered command
   */
  public executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const handler = this.commands.get(commandId)
    if (handler) {
      return Promise.resolve(handler(...args))
    }
    return Promise.reject(new Error(`Command '${commandId}' not found`))
  }

  /**
   * Get list of status bar items
   */
  public getStatusBarItems(): MockStatusBarItem[] {
    return this.statusBarItems
  }

  /**
   * Get a tree view by ID
   */
  public getTreeView(viewId: string): MockTreeView<any> | undefined {
    return this.treeViews.get(viewId)
  }

  /**
   * Add a workspace folder
   */
  public addWorkspaceFolder(folder: vscode.WorkspaceFolder): void {
    this.workspaceFolders.push(folder)
    this.onDidChangeWorkspaceFoldersEmitter.fire({
      added: [folder],
      removed: [],
    })
  }

  /**
   * Remove a workspace folder
   */
  public removeWorkspaceFolder(index: number): void {
    if (index >= 0 && index < this.workspaceFolders.length) {
      const removed = this.workspaceFolders.splice(index, 1)
      this.onDidChangeWorkspaceFoldersEmitter.fire({
        added: [],
        removed,
      })
    }
  }
}

/**
 * Mock implementation of VS Code output channel
 */
export class MockOutputChannel implements vscode.OutputChannel {
  private content = ""

  constructor(public readonly name: string) {}

  append(value: string): void {
    this.content += value
  }

  appendLine(value: string): void {
    this.content += `${value}\n`
  }

  clear(): void {
    this.content = ""
  }

  show(preserveFocus?: boolean): void
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void
  show(_columnOrPreserveFocus?: vscode.ViewColumn | boolean, _preserveFocus?: boolean): void {}

  hide(): void {}

  dispose(): void {}

  replace(value: string): void {
    this.content = value
  }

  getContent(): string {
    return this.content
  }
}

/**
 * Mock implementation of VS Code status bar item
 */
export class MockStatusBarItem implements vscode.StatusBarItem {
  public text = ""
  public tooltip: string | vscode.MarkdownString | undefined
  public color: string | vscode.ThemeColor | undefined
  public backgroundColor: vscode.ThemeColor | undefined
  public command: string | vscode.Command | undefined
  public accessibilityInformation: vscode.AccessibilityInformation | undefined
  public name: string | undefined
  public priority: number
  public alignment: vscode.StatusBarAlignment
  public isVisible = false
  public id = ""

  constructor(alignment: vscode.StatusBarAlignment, priority: number) {
    this.alignment = alignment
    this.priority = priority
  }

  show(): void {
    this.isVisible = true
  }

  hide(): void {
    this.isVisible = false
  }

  dispose(): void {
    // Nothing to do
  }
}

/**
 * Mock implementation of VS Code text document
 */
export class MockTextDocument implements vscode.TextDocument {
  private content = ""
  private _lineCount = 1
  private _version = 1
  private _eol = vscode.EndOfLine.LF

  constructor(public readonly fileName: string) {}

  get eol(): vscode.EndOfLine {
    return this._eol
  }

  get uri(): vscode.Uri {
    return vscode.Uri.file(this.fileName)
  }

  get isUntitled(): boolean {
    return false
  }

  get languageId(): string {
    return "plaintext"
  }

  get version(): number {
    return this._version
  }

  get isDirty(): boolean {
    return false
  }

  get isClosed(): boolean {
    return false
  }

  get lineCount(): number {
    return this._lineCount
  }

  lineAt(line: number): vscode.TextLine
  lineAt(position: vscode.Position): vscode.TextLine
  lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
    const line = typeof lineOrPosition === "number" ? lineOrPosition : lineOrPosition.line
    return {
      lineNumber: line,
      text: "",
      range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 0)),
      rangeIncludingLineBreak: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 0)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: true,
    }
  }

  offsetAt(_position: vscode.Position): number {
    return 0
  }

  positionAt(_offset: number): vscode.Position {
    return new vscode.Position(0, 0)
  }

  getText(_range?: vscode.Range): string {
    return this.content
  }

  getWordRangeAtPosition(position: vscode.Position, _regex?: RegExp): vscode.Range | undefined {
    return new vscode.Range(position, position)
  }

  validateRange(range: vscode.Range): vscode.Range {
    return range
  }

  validatePosition(position: vscode.Position): vscode.Position {
    return position
  }

  save(): Promise<boolean> {
    return Promise.resolve(true)
  }

  // Additional methods for testing
  setContent(content: string): void {
    this.content = content
    this._lineCount = content.split("\n").length
    this._version++
  }
}

/**
 * Mock implementation of VS Code tree view
 */
export class MockTreeView<T> implements vscode.TreeView<T> {
  private readonly onDidChangeSelectionEmitter = new MockEventEmitter<vscode.TreeViewSelectionChangeEvent<T>>()
  private readonly onDidChangeVisibilityEmitter = new MockEventEmitter<vscode.TreeViewVisibilityChangeEvent>()
  private readonly onDidExpandElementEmitter = new MockEventEmitter<vscode.TreeViewExpansionEvent<T>>()
  private readonly onDidCollapseElementEmitter = new MockEventEmitter<vscode.TreeViewExpansionEvent<T>>()
  private readonly onDidChangeCheckboxStateEmitter = new MockEventEmitter<vscode.TreeCheckboxChangeEvent<T>>()

  private _selection: T[] = []
  private _visible = false

  public onDidChangeSelection = this.onDidChangeSelectionEmitter.event
  public onDidChangeVisibility = this.onDidChangeVisibilityEmitter.event
  public onDidExpandElement = this.onDidExpandElementEmitter.event
  public onDidCollapseElement = this.onDidCollapseElementEmitter.event
  public onDidChangeCheckboxState = this.onDidChangeCheckboxStateEmitter.event

  constructor(
    public readonly viewId: string,
    private readonly options: vscode.TreeViewOptions<T>,
  ) {}

  badge?: vscode.ViewBadge | undefined

  public get selection(): T[] {
    return this._selection
  }

  public get visible(): boolean {
    return this._visible
  }

  public reveal(
    element: T,
    options?: { select?: boolean; focus?: boolean; expand?: number | boolean },
  ): Thenable<void> {
    if (options?.select && !this._selection.includes(element)) {
      this._selection = [element]
      this.onDidChangeSelectionEmitter.fire({ selection: this._selection })
    }
    return Promise.resolve()
  }

  public dispose(): void {
    // Nothing to do
  }

  // Additional methods for testing
  public setSelection(elements: T[]): void {
    this._selection = [...elements]
    this.onDidChangeSelectionEmitter.fire({ selection: this._selection })
  }

  public setVisibility(visible: boolean): void {
    if (this._visible !== visible) {
      this._visible = visible
      this.onDidChangeVisibilityEmitter.fire({ visible })
    }
  }

  public simulateExpand(element: T): void {
    this.onDidExpandElementEmitter.fire({ element })
  }

  public simulateCollapse(element: T): void {
    this.onDidCollapseElementEmitter.fire({ element })
  }

  public getDataProvider(): vscode.TreeDataProvider<T> {
    return this.options.treeDataProvider
  }

  message?: string | undefined
  title?: string | undefined
  description?: string | undefined
}
