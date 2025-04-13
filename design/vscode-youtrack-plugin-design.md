# Design Document: VSCode YouTrack Plugin

## 1. Introduction and Business Value

### 1.1 Purpose
The VSCode YouTrack Plugin aims to seamlessly integrate YouTrack issue and knowledge base management into the VSCode development environment. By allowing developers to interact with YouTrack content as markdown files, it significantly improves the workflow between coding and issue/documentation management.

### 1.2 Business Value
- Reduces context switching between VSCode and YouTrack web interface
- Streamlines documentation workflows through familiar markdown editing
- Improves accessibility of knowledge base articles during development
- Enhances productivity by providing search capabilities within the IDE
- Facilitates use of external AI tools with YouTrack content through VSCode

### 1.3 Target Users
- Software developers using VSCode and YouTrack
- Technical writers maintaining YouTrack Knowledge Base
- Project managers and team leads who work with issues and documentation

## 2. Functional Requirements

### 2.1 Core Functionality
- Authentication with YouTrack instance via permanent token
- Browse manually added YouTrack projects, their issues, and knowledge base articles
- Open issue descriptions and articles as markdown files in VSCode tabs
- Edit and save issue descriptions and articles back to YouTrack
- Search functionality for issues and articles
- Act as MCP (Message Control Program) server for AI assistants

### 2.2 Issue Management
- Add and remove YouTrack projects from the Projects panel
- Browse issues for selected projects
- View issue descriptions, comments, and custom fields in a read-only preview using VS Code's built-in Markdown viewer
- Edit issue descriptions in a separate editing phase
- Support for issue attachments
- Internal links to other issues open in new preview tabs

### 2.3 Knowledge Base Management
- Browse article hierarchy 
- View articles in preview mode with VS Code's built-in Markdown viewer and Mermaid diagram support
- Preview triggered by user selection, not automatically
- Internal links parsed based on project shortName cache
- Internal links to other articles open in new preview tabs
- Download articles to temporary folder for editing via explicit action
- Save edited articles back to YouTrack with explicit "Save to YouTrack" action
- Track temporary files and clean up on editor close

### 2.4 Search and Navigation
- Full-text search across issues and articles
- Filter by project, tag, status, and other attributes
- Quick navigation between related issues and articles
- History of recently accessed items

### 2.5 AI Integration
- Extension acts as MCP server for AI assistants to interact with YouTrack content
- Provides structured resources for projects, articles, issues, and comments
- Exposes YouTrack entities in AI-readable format
- Enables AI-assisted issue management and documentation
- Supports natural language queries against YouTrack data

## 3. Technical Design

### 3.1 Architecture Overview
The plugin will follow a modular architecture with the following components:
- Authentication Module
- YouTrack API Client (based on youtrack-client)
- Document Manager (handling YouTrack content in VSCode editors)
- Search and Indexing Engine
- VSCode Extension Interface
- MCP Server for AI Integration

### 3.2 Integration Points
- VSCode Extension API
- YouTrack REST API (via youtrack-client)

### 3.3 Data Flow
1. User authenticates with YouTrack instance using a permanent token
2. Plugin fetches and caches available projects, issues, and articles
3. User browses or searches for content
4. Selected content is fetched and displayed in preview mode using VS Code's built-in Markdown viewer with Mermaid diagram support
5. Internal links in content are detected and parsed based on project shortName cache for navigation
6. When user clicks internal links, they open in new preview tabs
7. When "Download for Editing" is requested, content is copied to a configurable temporary location
8. User edits the content in VSCode's native markdown editor
9. When "Save to YouTrack" is triggered, changes are synchronized back to YouTrack and temp file is deleted
10. When editor tab is closed, any remaining temporary files are cleaned up

### 3.4 User Interface Components
- YouTrack Explorer view in Activity Bar
- VSCode's native markdown editor for YouTrack content
- Search interface with filtering options
- Context menus for common actions

### 3.5 Authentication and Security
- Secure storage of YouTrack permanent tokens

### 3.6 AI MCP Server Integration
- The extension will act as an MCP server for AI assistants
- Server will provide structured access to YouTrack entities:
  - Projects: list, metadata, permissions
  - Issues: search, view, create, update, link
  - Articles: browse, view, edit
  - Comments: read, create, reply
- Data will be transformed into AI-friendly formats
- Authentication and authorization handled by the extension
- Caching layer for improved performance
- Command registration for AI-triggered actions

## 4. Implementation Plan

### 4.1 Technical Stack
- TypeScript for plugin development
- VSCode Extension API
- youtrack-client for API interactions
- VSCode's built-in markdown preview functionality
- Native VSCode UI components
- WebSocket server for AI assistant communication
- JSON Schema for structured data exchange

### 4.2 Project Structure
```
vscode-youtrack-plugin/
├── .vscode/                  # VSCode configuration
├── design/                   # Design documents and diagrams
├── src/                      # Source code
│   ├── authentication/       # Authentication modules
│   ├── api/                  # YouTrack API client wrapper
│   ├── views/                # UI components
│   ├── commands/             # Command implementation
│   ├── providers/            # VSCode providers (tree view, etc.)
│   ├── search/               # Search functionality
│   ├── mcp/                  # MCP server implementation for AI
│   │   ├── server.ts         # WebSocket server setup
│   │   ├── resources/        # Resource handlers for YouTrack entities
│   │   ├── commands/         # AI-invokable commands
│   │   └── schema/           # JSON Schema definitions
│   ├── utils/                # Utility functions
│   └── extension.ts          # Extension entry point
├── test/                     # Test cases
├── resources/                # Static resources
├── package.json              # Extension manifest
└── README.md                 # Extension documentation
```

### 4.3 Development Phases
1. Setup project and implement authentication
2. Implement basic browse and search functionality
3. Integrate with VSCode's native markdown viewing and editing capability
4. Implement save functionality for issue descriptions and articles
5. Implement advanced features and optimizations
6. Testing and quality assurance
7. Documentation and release preparation

### 4.4 Testing Strategy
- Unit tests for core components
- Integration tests for API interactions
- End-to-end tests for workflow validation
- Manual testing for UI/UX validation

## 5. Limitations and Constraints

### 5.1 Technical Limitations
- Performance constraints with large YouTrack instances
- Limitations in YouTrack API capabilities
- VSCode extension sandbox restrictions
- Handling of complex formatting and attachments

### 5.2 User Experience Considerations
- Performance of real-time updates and synchronization
- Handling of concurrent edits (by multiple users)

### 5.3 Integration Challenges
- Authentication via permanent token only
- Handling various YouTrack versions and configurations

## 6. Future Enhancements

### 6.1 Potential Future Features
- Support for editing comments and custom fields
- Advanced visualizations (issue boards, timelines)

## 7. Appendices

### 7.1 Glossary
- **YouTrack**: JetBrains' issue tracking and project management tool
- **Knowledge Base**: Collection of articles and documentation in YouTrack
- **Markdown**: Lightweight markup language for creating formatted text
- **VSCode Extension**: Plugin that extends Visual Studio Code functionality

### 7.2 References
- [YouTrack REST API Documentation](https://www.jetbrains.com/help/youtrack/devportal/api-concepts.html)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [youtrack-client Library](https://github.com/udamir/youtrack-client)

### 7.3 API Documentation
- Reference for plugin API interfaces will be developed alongside the code
