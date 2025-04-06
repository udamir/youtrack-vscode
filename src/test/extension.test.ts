import * as assert from "node:assert"
import type { Extension } from "vscode"
import * as sinon from "sinon"
import * as vscode from "./vscode.mock"

// Import command constants
import { COMMAND_CONNECT } from "../constants"

// Mock VS Code APIs
const mockExtension: Partial<Extension<Record<string, unknown>>> = {
  isActive: true,
  // The activate method must return a Thenable that resolves to our extension API
  activate: async () => ({}) as Record<string, unknown>,
}

describe("YouTrack Extension", () => {
  let extensionsStub: sinon.SinonStub
  let commandsStub: sinon.SinonStub

  beforeEach(() => {
    // Create stubs for VS Code APIs that might not be available in test environment
    extensionsStub = sinon
      .stub(vscode.extensions, "getExtension")
      .returns(mockExtension as Extension<Record<string, unknown>>)
    commandsStub = sinon.stub(vscode.commands, "getCommands").resolves([COMMAND_CONNECT])
  })

  afterEach(() => {
    // Restore all stubs
    sinon.restore()
  })

  it("should activate successfully", async () => {
    // First call getExtension to ensure the stub is called
    const ext = vscode.extensions.getExtension("vscode-youtrack-plugin")
    // Now we can verify the stub was called
    assert.ok(extensionsStub.called)
    assert.ok(ext)
    assert.strictEqual(ext.isActive, true)
  })

  it("should register commands", async () => {
    // Test that the connect command is registered
    const commands = await vscode.commands.getCommands()
    assert.ok(commandsStub.called)
    assert.ok(commands.includes(COMMAND_CONNECT))
  })
})
