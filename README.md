# YouTrack extension for VSCode 

A Visual Studio Code extension that integrates YouTrack issue management and knowledge base capabilities directly into your development environment.

## Features

- Browse and manage YouTrack projects, issues, and knowledge base articles
- Search for issues with advanced filtering and text completion
- View and edit issues with metadata and linked issues
- View and edit knowledge base articles
- Recent items tracking for quick access to frequently used content
- Status bar indicator for connection status

## Requirements

- Visual Studio Code 1.80.0 or higher
- YouTrack instance with REST API access
- Permanent authentication token for YouTrack

## Extension Settings

This extension contributes the following settings:

* `youtrack.instanceUrl`: URL of the YouTrack instance
* `youtrack.recentItemsLimit`: Number of recent items to display

## Getting Started

1. Install the extension from the VSCode Marketplace
2. Open the command palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run the command "YouTrack: Connect to YouTrack Instance"
4. Enter your YouTrack URL and authentication token
5. Access YouTrack content from the YouTrack view in the Activity Bar

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

## Testing

### Unit Tests

Run the unit tests with:

```bash
bun run test:unit
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

## License

[MIT](LICENSE)
