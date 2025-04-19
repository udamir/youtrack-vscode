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
- Edit issue descriptions in a custom editor with YAML frontmatter and Markdown content
- Support for issue attachments
- Internal links to other issues open in new preview tabs
- Two-way synchronization between local edits and YouTrack server

### 2.3 Knowledge Base Management
- Browse article hierarchy 
- View articles in preview mode with VS Code's built-in Markdown viewer and Mermaid diagram support
- Preview triggered by user selection, not automatically
- Internal links parsed based on project shortName cache
- Internal links to other articles open in new preview tabs
- Edit articles in a custom editor with YAML frontmatter and Markdown content
- Save edited articles back to YouTrack with explicit "Save to YouTrack" action
- Fetch latest content from YouTrack with "Fetch from YouTrack" action
- Visual indicators for sync status (synced, not-synced, conflict)
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
- Content Synchronization Engine
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
7. When "Open in Editor" is requested, content is created in a configurable temporary location as a .yt file with YAML frontmatter and Markdown content
8. User edits the content in VSCode's editor
9. The extension tracks sync status (synced, not-synced, conflict) based on local and remote timestamps and content
10. When "Save to YouTrack" is triggered, changes are synchronized back to YouTrack
11. When "Fetch from YouTrack" is triggered, local content is updated from the server
12. When "Unlink" is triggered or editor tab is closed, temporary files are cleaned up

### 3.4 User Interface Components
- YouTrack Explorer view in Activity Bar
- Projects panel with list of projects, issues, articles, and locally edited files
- Custom editor for .yt files with YAML frontmatter and Markdown content
- Sync status indicators for edited files
- Context menus for common actions:
  - Open in Editor
  - Save to YouTrack
  - Fetch from YouTrack
  - Unlink
- Settings button for quick access to configuration
- VSCode's native markdown editor for content editing
- Search interface with filtering options

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
4. Implement YouTrack content editor with synchronization capabilities: 
   - Custom editor for .yt files with YAML frontmatter and Markdown content
   - Two-way synchronization with YouTrack server
   - Projects panel integration with sync status indicators
   - Context actions for fetching, saving, and unlinking content
   - Configurable temporary file storage
   - Error handling and user feedback
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

## 8. Appendices

### 8.1 Phase 4 Implementation Summary: YouTrack Content Editor

#### 8.1.1 File Format and Structure
- YouTrack content represented as `.yt` files
- Filename format: `[idReadable].yt` (e.g., `PROJECT-123.yt`)
- Content structure:
  - YAML frontmatter containing metadata
  - Markdown content section

#### 8.1.2 Editor Infrastructure
- Custom editor provider for `.yt` files
- Virtual document handling for YouTrack content
- Configurable temporary file storage with fallback to extension storage
- Runtime directory validation and creation

#### 8.1.3 Synchronization Logic
- Two-way synchronization between local files and YouTrack
- Three-state tracking: synced, not-synced, conflict
- Timestamp and content-based sync status determination
- Explicit user-initiated sync actions:
  - Fetch from YouTrack (server → local)
  - Save to YouTrack (local → server)
  - Unlink (remove local file)

#### 8.1.4 Projects Panel Integration
- Local `.yt` files displayed under respective projects
- Sync status indicators for files
- Context menu actions for each file
- Settings access button

#### 8.1.5 UI/UX Features
- Visual indication of sync status in editor and project panel
- Command palette entries for common actions
- Status indicators for synchronization operations
- Error handling with clear user feedback

#### 8.1.6 Lessons Learned
- Temporary storage management requires robust validation and fallback mechanisms
- User-facing feedback about configuration issues improves experience
- Session persistence through workspace state enhances continuity
- Proper resource cleanup is critical for stability
- Clear visual indicators help users understand file synchronization state
