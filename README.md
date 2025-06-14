# YouTrack extension with MCP Server
![Open VSX Version](https://img.shields.io/open-vsx/v/udamir/youtrack-vscode)
![Open VSX Downloads](https://img.shields.io/open-vsx/dt/udamir/youtrack-vscode?label=downloads:+OpenVSX)
![Open VSX Rating](https://img.shields.io/open-vsx/stars/udamir/youtrack-vscode)
![GitHub](https://img.shields.io/github/license/udamir/youtrack-vscode)

A Visual Studio Code extension that integrates YouTrack issue management and knowledge base capabilities directly into your development environment.

> **DISCLAIMER:** This project is currently under active development. Features may change, and some functionality might be incomplete or experimental. We welcome feedback and contributions as we work toward a stable release.

## Features

- Browse and manage YouTrack projects, issues, and knowledge base articles
- Search for issues with advanced filtering and text completion
- View and edit issues with metadata and linked issues
- View and edit knowledge base articles
- Recent items tracking for quick access to frequently used content
- Status bar indicator for connection status
- Model Context Protocol (MCP) integration
  - YouTrack data accessible through AI assistants like GitHub Copilot, Cursor, and VS Code Copilot
  - Custom MCP server for direct AI interaction with YouTrack issues and articles
  - Seamless querying of YouTrack projects and entities from within your AI coding assistant

## Requirements

- Visual Studio Code 1.74.0 or higher
- YouTrack instance with REST API access
- Permanent authentication token for YouTrack

## Extension Settings

This extension contributes the following settings that can be modified in your `settings.json` file or through the Settings UI:

### Connection Settings

* `youtrack.instanceUrl`: URL of the YouTrack instance (e.g., `https://youtrack.example.com` or `https://example.youtrack.cloud`)  
* `youtrack.tokenStorage`: Where to store the authentication token (Default: `"secure"`)  

### Display and Performance

* `youtrack.recentItemsLimit`: Maximum number of recent items to display in the Recent Items view (Default: `15`)
* `youtrack.tempFolderPath`: Directory path for storing temporary files used for editing YouTrack content (Default: `"${workspaceFolder}/temp"`)  

### MCP Server Configuration

* `youtrack.mcpServer.enabled`: Enable/disable the AI Model Context Protocol server (Default: `false`)  
* `youtrack.mcpServer.port`: Port number for the MCP server (Default: `4777`)  
  
**Note:** When changing MCP server settings, you need to reload VS Code for the changes to take effect.

## Getting Started

1. Install the extension from the VSCode Marketplace
2. Open the command palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run the command "YouTrack: Connect to YouTrack Instance"
4. Enter your YouTrack URL and authentication token
5. Access YouTrack content from the YouTrack view in the Activity Bar
6. Configure MCP (optional)

## MCP Integration

The YouTrack extension now includes Model Context Protocol (MCP) server integration, allowing you to interact with YouTrack through AI assistants. This cutting-edge feature enables developers to:

- Query YouTrack projects and entities directly from AI coding assistants
- Retrieve issue and article information without leaving your coding environment
- Use natural language to interact with YouTrack data

### Available MCP Tools

- **youtrack-get-projects**: Lists all available YouTrack projects you have access to
- **youtrack-get-entities-by-id**: Retrieves specific issues and articles by their IDs

### MCP Server Troubleshooting

If you're having issues with the MCP server integration:

1. **Verify MCP Server Status**
   - Check the VS Code output panel (View → Output → YouTrack)
   - Look for messages like "MCP server started on port 4777"
   - Ensure no port conflicts with other applications

2. **Connection Test**
   - After enabling the MCP server, you can test if it's running correctly by opening a browser and navigating to `http://localhost:4777/`
   - You should see a message indicating the MCP server is running

3. **Common Issues**
   - Port already in use: Change the port in settings
   - Authentication errors: Verify your YouTrack token is valid
   - MCP tool not found by AI assistant: Ensure the extension is correctly configured in your AI assistant settings

### MCP Configuration

### Windsurf / Cursor

In your mcp_config.json file (File → Preferences → Windsurf Settings → Click “Manage Plugins” button → Click “View raw config” button), add the following:
```json
{
   "mcpServers": {
      "youtrack-mcp-server": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:4777/mcp", "--allow-http"]
      }
   }
}
```

### Zencoder.ai

In config (Agent Tools → Add Custom MCP), use “YouTrack” name and add the following MCP server config:
```json
{
    "command": "npx",
    "args": [
        "mcp-remote",
        "http://localhost:4777/mcp/"
    ]
}
```

### VS Code Copilot Chat

In your User settings.json file (File → Preferences → Settings → Click “Edit in settings.json” link in “Mcp” section), add:
```json
{
  "mcp": {
    "servers": {
      "youtrack-mcp-server": {
        "type": "http",
        "url": "http://localhost:4777/mcp/"
      }
    }
  }
}
```

## Development

### Prerequisites

- Node.js 18 or higher
- Bun package manager
- Visual Studio Code

### Setup

```bash
# Clone the repository
git clone https://github.com/udamir/youtrack-vscode.git
cd youtrack-vscode

# Install dependencies
bun install

# Build the extension
bun run compile

# Run tests
bun run test
```

### Integration Tests

Integration tests require a real YouTrack instance and valid credentials.

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your YouTrack credentials:
   ```
   YOUTRACK_BASE_URL=https://your-instance.youtrack.cloud
   YOUTRACK_TOKEN=perm:your-permanent-token
   ```
3. Run the integration tests:
   ```bash
   bun run test:integration
   ```

Note: Integration tests will be skipped if no credentials are provided.

## Development Status

This extension is being actively developed with the following roadmap:

- **Current Phase**: Implementation of core functionality and MCP integration
  - YouTrack project, issue, and article browsing ✅
  - Authentication and secure token storage ✅
  - MCP server for AI assistant integration ✅

- **Coming Soon**:
  - Enhanced issue editing capabilities
  - Improved offline support
  - Advanced search filters
  - Additional MCP tools for richer AI interactions

We welcome bug reports, feature requests, and contributions. Please submit issues on our GitHub repository.

## Support

[Buy me a coffee](https://buymeacoffee.com/udamir)

## License

[MIT](LICENSE)
