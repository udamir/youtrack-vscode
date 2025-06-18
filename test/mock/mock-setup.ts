import { VSCodeMock } from "./mock-vscode"
import { mock, jest, beforeEach } from "bun:test"

// Mock the vscode module
mock.module("vscode", () => {
  return VSCodeMock.createMockVSCodeApi()
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
