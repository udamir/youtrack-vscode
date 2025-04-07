// Global Jest setup file for mocking external dependencies

// Import and use the consolidated VSCode mock
jest.mock("vscode", () => require("./vscode"), { virtual: true })

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
