import { VSCodeMock } from "./mock-vscode"

// Mock the vscode module
jest.mock("vscode", () => {
  return VSCodeMock.createMockVSCodeApi()
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
