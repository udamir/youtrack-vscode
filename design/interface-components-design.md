# VSCode YouTrack Plugin: Interface Components Design

This document details the interface components of the VSCode YouTrack Plugin and explains how they fulfill the requirements specified in the main design document.

## 1. Overview

The plugin's interface is integrated into the VSCode environment, utilizing native VSCode UI patterns for consistency and familiarity. The interface consists of several key components working together to provide a seamless experience for working with YouTrack content.

## 2. Interface Components

### 2.1 YouTrack Activity Bar View

**Component Description:**
- A dedicated activity bar icon in the VSCode sidebar that provides access to all YouTrack-related functionality.
- When clicked, it opens the YouTrack explorer view in the side panel.

**Requirements Fulfilled:**
- Provides entry point to browse YouTrack projects, issues, and knowledge base articles
- Enables quick access to search functionality

**Visual Design:**
```
[YT Icon] <- Activity Bar Icon (uses YouTrack logo)
```

### 2.2 Explorer View with Multiple Panels

**Component Description:**
The explorer sidebar will contain five separate collapsible panels:

1. **Projects Panel**
   - A dedicated panel showing manually added YouTrack projects (not all available projects)
   - "Add Project" button at the top of the panel to add projects from YouTrack
   - Context menu option to remove projects from the panel
   - Project persistence across sessions (remembered between restarts)
   - Single-select functionality (only one project can be selected at a time)
   - Project selection affects the content shown in Issues and Knowledge Base panels
   - Each project displays name and potentially icon/status
   - When YouTrack is not configured, displays a prominent "Setup Connection" button that launches the Configuration Wizard

2. **Issues Panel**
   - Displays issues for the currently selected project
   - Includes a filter input field at the top
   - Toggle button to switch between list and tree view modes
   - List view: flat list of issues for the selected project
   - Tree view: hierarchical display based on issue links
   - Each issue displays ID, summary, and potentially status icon

3. **Knowledge Base Panel**
   - Displays articles for the currently selected project
   - Hierarchical tree view of articles
   - Structured according to YouTrack's knowledge base organization
   - Each article displays title and potentially last modified date

4. **Recent Issues Panel**
   - Shows recently opened issues across all projects
   - Not dependent on the currently selected project
   - Displays issue ID, summary, project, and timestamp
   - Limited to a configurable number of items (default: 10)

5. **Recent Articles Panel**
   - Shows recently opened articles across all projects
   - Not dependent on the currently selected project
   - Displays article title, project, and timestamp
   - Limited to a configurable number of items (default: 10)

**Requirements Fulfilled:**
- Browse projects and issues hierarchy based on links
- Browse article hierarchy
- Quick navigation between related issues and articles
- History of recently accessed items

**Visual Design:**
```
YOUTRACK                 [Refresh]

PROJECTS                 [▼]
  ├── Project A (selected) 
  ├── Project B
  └── Project C

ISSUES                   [▼]
  Filter: [____________] [List|Tree]
  ├── PRJ-1: Issue title
  ├── PRJ-2: Issue title
  └── PRJ-3: Issue title

KNOWLEDGE BASE           [▼]
  ├── Category 1
  │   ├── Article 1
  │   └── Article 2
  └── Article 3

RECENT ISSUES            [▼]
  ├── PRJ-1: Issue title (3m ago)
  ├── PROJ-45: Issue title (1h ago)
  └── DEV-12: Issue title (2d ago)

RECENT ARTICLES          [▼]
  ├── Article 1 (1h ago)
  ├── Setup Guide (2d ago)
  └── Release Notes (3d ago)
```

### 2.3 Search View

**Component Description:**
- A search interface panel focused exclusively on issues with:
  - Search input field with support for YouTrack query syntax
  - Intelligent text completion with input options as you type
  - Autosuggestions for field names, operators, and values
  - Filter options (projects, types, status, etc.)
  - Results list showing matching issues only
  - Preview of matched content in issues

**Requirements Fulfilled:**
- Full-text search across issues
- Filter by project, tag, status, and other attributes
- Intelligent query construction with input assistance

**Visual Design:**
```
SEARCH                   [Clear]
┌─────────────────────────────┐
│ project: PROJ status: Op▼   │
└─────────────────────────────┘
  ↳ Suggestions: [Open] [In Progress] [Fixed]

Results (8):
  ├── PRJ-123: Issue title with match
  ├── PRJ-456: Another matching issue
  └── ...
```

### 2.4 Issue View

**Component Description:**
- A custom editor that initially displays issue content in preview mode
- Markdown preview with support for Mermaid diagrams and interactive internal links
- Metadata panel showing issue attributes (status, assigned to, etc.)
- Links section displaying all linked issues grouped by link types (e.g., "Depends on", "Relates to", "Blocks", "Subtask of", "Parent for", etc.)
  - Each linked issue shows both ID and summary for better context
- Read-only view of comments
- Tab-based navigation between description, comments, and attachments
- "Download for Editing" action in sidebar that explicitly downloads content to predefined temporary folder
- Downloaded documents have a "Save to YouTrack" action that syncs changes and deletes the temp file after saving
- Cleanup of temporary files when editing tab is closed

**Requirements Fulfilled:**
- View issue descriptions, comments, and custom fields with Mermaid diagram support
- Edit issue descriptions in a dedicated editing mode
- Support for issue attachments
- Navigate between related issues through interactive links
- Clear separation between viewing and editing modes

**Visual Design:**
```
[Issue PRJ-123: Issue Title]   [Refresh]

Summary: Issue Title
ID: PRJ-123
Created: Apr 6, 2025
Status: Open
Assignee: John Doe

Links:
  Depends on: PRJ-120: Update authentication module, PRJ-121: Fix database schema
  Relates to: PRJ-100: Add user profile page
  Duplicates: PRJ-90: Login screen freezes on Safari

Tabs: [Description] [Comments] [Attachments]

[Markdown Preview with Mermaid Support]
# Issue Description
This is the issue description in preview mode.

```graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

Sidebar Actions:
[📥 Download for Editing]  [🔄 Refresh]
```

For downloaded temp documents:
```
[Issue PRJ-123: Issue Title (Editing)]

[VSCode Markdown Editor]
# Issue Description
This is the issue description being edited locally.

```graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

Sidebar Actions:
[💾 Save to YouTrack]  [❌ Discard Changes]
```

### 2.5 Article Editor

**Component Description:**
- Initially displays article content in preview mode with Mermaid diagram support
- Interactive internal links in preview mode
- Metadata panel showing article properties
- "Download for Editing" action in sidebar that explicitly downloads content to predefined temporary folder
- Downloaded documents have a "Save to YouTrack" action that syncs changes and deletes the temp file after saving
- Cleanup of temporary files when editing tab is closed

**Requirements Fulfilled:**
- View articles with Mermaid diagram support
- Edit articles in a dedicated editing mode
- Support for article attachments
- Navigate between related articles through interactive links
- Clear separation between viewing and editing modes

**Visual Design:**
```
[Article: Article Title]   [Refresh]

Title: Article Title
Space: Project Knowledge Base
Created: Apr 6, 2025
Modified: Apr 6, 2025

[Markdown Preview with Mermaid Support]
# Article Title
Article content in preview mode.

```graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

Sidebar Actions:
[📥 Download for Editing]  [🔄 Refresh]
```

For downloaded temp documents:
```
[Article: Article Title (Editing)]

[VSCode Markdown Editor]
# Article Title
Article content being edited locally.

```graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

Sidebar Actions:
[💾 Save to YouTrack]  [❌ Discard Changes]
```

### 2.6 Status Bar Item

**Component Description:**
- Status bar item showing:
  - Connection status icon (✓ for connected, ✗ for disconnected)
  - "YouTrack" label
  - Tooltip displaying the YouTrack instance URL when hovering
  - Click action to open connection settings

**Requirements Fulfilled:**
- Authentication with YouTrack instance
- Connection status feedback

**Visual Design:**
```
[Bottom Status Bar]
... [✓ YouTrack] ...
```

### 2.7 Commands and Context Menus

**Component Description:**
- Command palette entries for all plugin actions
- Context menus for tree items with relevant actions:
  - Issues: Open, Copy Link, etc.
  - Articles: Open, Copy Link, etc.
  - Projects: Search Within, etc.

**Requirements Fulfilled:**
- Quick operations on YouTrack entities
- Keyboard accessibility

**Visual Design:**
```
Right-click on issue:
┌─────────────────────────┐
│ Open                    │
│ Copy Issue ID           │
│ Copy Link to Issue      │
│ Refresh                 │
│ Find Related Issues     │
└─────────────────────────┘
```

### 2.8 Settings Page

**Component Description:**
- Dedicated settings section in VSCode settings
- Configuration options for:
  - YouTrack connection (URL, token)
  - Display preferences
  - Cache settings
  - Editor behavior

**Requirements Fulfilled:**
- Authentication with YouTrack instance via permanent token
- Customization of plugin behavior

**Visual Design:**
```
Settings: YouTrack

YouTrack Instance URL: [https://example.youtrack.cloud]
Authentication Token: [••••••••••••••••]
Cache Timeout: [30] minutes
Number of Recent Items: [10]
```

### 2.9 Configuration Wizard

**Component Description:**
- A guided setup flow that appears when the plugin is not configured
- Accessible via a prominent "Setup Connection" button in the Explorer View sidebar
- Multi-step wizard with:
  - Welcome screen explaining YouTrack integration benefits
  - YouTrack instance URL input with validation
  - Authentication token input with guidance on how to create one
  - Test connection step with real-time feedback
  - Completion screen with next steps

**Requirements Fulfilled:**
- Simplifies first-time setup experience
- Guides users through authentication process
- Validates connection before proceeding

**Visual Design:**
```
┌─────────────────────────────────────┐
│ Configure YouTrack Connection       │
│                                     │
│ Step 2 of 3: Enter Auth Token       │
│ ─────────────────────────────────── │
│                                     │
│ Enter your YouTrack permanent token:│
│ [••••••••••••••••••••••••••]        │
│                                     │
│ How to get a token? [Learn More]    │
│                                     │
│ [Back]                   [Next >]   │
└─────────────────────────────────────┘
```

## 3. User Interactions

### 3.1 Authentication Flow

1. User installs the extension
2. The extension detects no configuration is present and displays:
   - A "Setup Connection" button in the Explorer View
   - A notification suggesting configuration
3. User clicks the "Setup Connection" button in the sidebar
4. Configuration Wizard appears, guiding the user through setup:
   - Enter YouTrack URL
   - Generate and enter permanent token
   - Test connection
5. Upon successful connection, the YouTrack explorer panels are populated with data
6. Status bar updates to show connected status

### 3.2 Project Selection and Navigation

1. User selects a project from the Projects panel
2. Issues and Knowledge Base panels update to show content for the selected project
3. User can switch between list and tree views for issues
4. User can expand/collapse the knowledge base tree

### 3.3 Opening and Editing Issues

1. User locates an issue in the Issues panel or Recent Issues panel
2. User clicks on the issue to open it in the editor
3. User views the issue in preview mode with interactive links and Mermaid diagrams
4. User clicks the "Download for Editing" action in the sidebar to download the issue content to a predefined temporary folder
5. User edits the issue description in the markdown editor
6. User clicks "Save to YouTrack" to update the issue in YouTrack
7. The issue is automatically added/updated in the Recent Issues panel

### 3.4 Working with Articles

1. User locates an article in the Knowledge Base panel or Recent Articles panel
2. User clicks on the article to open it in the editor
3. User views the article in preview mode with interactive links and Mermaid diagrams
4. User clicks the "Download for Editing" action in the sidebar to download the article content to a predefined temporary folder
5. User edits the article content in the markdown editor
6. User clicks "Save to YouTrack" to update the article in YouTrack
7. The article is automatically added/updated in the Recent Articles panel

### 3.5 Searching for Content

1. User enters search terms in the filter input of the Issues panel or uses the global search
2. Results appear in the respective view
3. User clicks on a result to open it in the editor

## 4. Interaction with Requirements

This section maps interface components to functional requirements to ensure complete coverage.

| Functional Requirement | Interface Component(s) |
|------------------------|------------------------|
| Authentication with YouTrack | Settings Page, Status Bar Item, Configuration Wizard |
| Browse projects | Projects Panel in Explorer |
| Browse issues hierarchy | Issues Panel with Tree View mode |
| View issue descriptions | Issue View |
| Edit issue descriptions | Issue View (markdown editor) |
| Browse article hierarchy | Knowledge Base Panel in Explorer |
| Edit articles | Article Editor |
| Create new articles | Command Palette, Article Editor |
| Search functionality | Filter input in Issues Panel, Search View |
| Filter search results | Search View |
| Quick navigation | Recent Issues and Recent Articles Panels |

## 5. UI/UX Considerations

### 5.1 Design Principles

- **Consistency**: Use VSCode's native UI patterns and controls
- **Context**: Provide contextual actions where users expect them
- **Clarity**: Clear labeling and organization of information
- **Efficiency**: Minimize clicks for common operations

### 5.2 Keyboard Accessibility

- All functions accessible via keyboard shortcuts
- Command palette integration for all actions
- Tab navigation support

### 5.3 Error States

- Clear error messages for connection issues
- Retry mechanisms for failed operations
- Offline indicators when disconnected

## 6. Interface Diagrams

### 6.1 Complete VSCode Interface with YouTrack Plugin Components

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ VISUAL STUDIO CODE                                              □ ○ ✕             │
├─────┬─────────────────────────────────────────────────────────────────────────────┤
│  E  │ EXPLORER: YOUTRACK                                   ⟳                      │
│  x  │ ┌───────────────────────────────────────────────────────────────────┐       │
│  p  │ │ PROJECTS                                          [▼]             │       │
│  l  │ │   ├── Project Alpha (selected)                                    │       │
│  o  │ │   ├── Project Beta                                                │       │
│  r  │ │   └── Project Gamma                                               │       │
│  e  │ │                                                                   │       │
│  r  │ │ ISSUES                                            [▼]             │       │
│     │ │   Filter: [priority: high           ]  [List|Tree]                │       │
│  B  │ │   ├── ALPHA-123: Fix critical login bug                           │       │
│  a  │ │   ├── ALPHA-127: Update documentation                             │       │
│  r  │ │   └── ALPHA-129: Improve error handling                           │       │
│     │ │                                                                   │       │
│  [F]│ │ KNOWLEDGE BASE                                    [▼]             │       │
│  [D]│ │   ├── Development                                                 │       │
│  [E]│ │   │   ├── Setup Guide                                             │       │
│  [Y]│ │   │   └── Coding Standards                                        │       │
│  [S]│ │   └── User Manual                                                 │       │
│  [G]│ │                                                                   │       │
│     │ │ RECENT ISSUES                                     [▼]             │       │
│     │ │   ├── PRJ-1: Issue title (3m ago)                                 │       │
│     │ │   ├── PROJ-45: Issue title (1h ago)                               │       │
│     │ │   └── DEV-12: Issue title (2d ago)                                │       │
│     │ │                                                                   │       │
│     │ │ RECENT ARTICLES                                   [▼]             │       │
│     │ │   ├── Article 1 (1h ago)                                          │       │
│     │ │   ├── Setup Guide (2d ago)                                        │       │
│     │ │   └── Release Notes (3d ago)                                      │       │
│     │ └───────────────────────────────────────────────────────────────────┘       │
├─────┼─────────────────────────────────────────────────────────────────────────────┤
│  S  │ SEARCH                                              [Clear]                 │
│  e  │ ┌─────────────────────────────────────────────────────────────────┐         │
│  a  │ │ project: PROJ status: Op▼                                       │         │
│  r  │ └─────────────────────────────────────────────────────────────────┘         │
│  c  │   ↳ Suggestions: [Open] [In Progress] [Fixed]                               │
│  h  │                                                                             │
│     │ Results (8):                                                                │
│     │   ├── PRJ-123: Issue title with match                                       │
│     │   ├── PRJ-456: Another matching issue                                       │
│     │   └── ...                                                                   │
├─────┼─────────────────────────────────────────────────────────────────────────────┤
│     │ ┌─── Issue ALPHA-123: Fix critical login bug ───┐ ┌─── README.md ───┐       │
│  E  │ │                                               │ │                 │       │
│  d  │ │ Summary: Fix critical login bug      [Save] [Refresh]             │       │
│  i  │ │ ID: ALPHA-123                                                     │       │
│  t  │ │ Status: Open                                                      │       │
│  o  │ │ Assignee: John Doe                                                │       │
│  r  │ │                                                                   │       │
│     │ │ Links:                                                            │       │
│     │ │   Depends on: ALPHA-120: Update API endpoints, ALPHA-121: Fix database connection│       │
│     │ │   Relates to: BETA-100: Redesign mobile layout                    │       │
│     │ │                                                                   │       │
│  A  │ │ Tabs: [Description] [Comments] [Attachments]                      │       │
│  r  │ │                                                                   │       │
│  e  │ │ # Login Bug                                                       │       │
│  a  │ │                                                                   │       │
│     │ │ Users are unable to log in when using Safari on iOS devices.      │       │
│     │ │                                                                   │       │
│     │ │ ## Steps to reproduce                                             │       │
│     │ │ 1. Open the application on Safari (iOS)                           │       │
│     │ │ 2. Enter credentials                                              │       │
│     │ │ 3. Tap "Login"                                                    │       │
│     │ │                                                                   │       │
│     │ │ The page refreshes but user remains on the login screen.          │       │
│     │ │                                                                   │       │
│     │ │                                                                   │       │
│     │ │                                                                   │       │
│     │ └───────────────────────────────────────────────┘ └─────────────────┘       │
├─────┴─────────────────────────────────────────────────────────────────────────────┤
│ TERMINAL                                                                          │
├───────────────────────────────────────────────────────────────────────────────────┤
│ PROBLEMS  OUTPUT  DEBUG CONSOLE  TERMINAL                                         │
│                                                                                   │
│ >                                                                                 │
└───────────────────────────────────────────────────────────────────────────────────┘
[✓ YouTrack]                                                           Lines: 23  │
```

The above diagram illustrates how all the YouTrack plugin components would integrate into the standard VSCode interface:

1. **Activity Bar** - Left side with YouTrack icon (represented as [Y])
2. **Explorer Panels** - Five collapsible panels in the side bar
3. **Search View** - With query input and autocompletion suggestions
4. **Editor Area** - Showing a YouTrack issue with metadata and markdown content
5. **Status Bar** - With connection status indicator at the bottom

This representation helps visualize how the plugin will maintain VSCode's familiar layout while adding YouTrack-specific functionality.

### 6.2 Component Implementation Details

In the actual implementation, the VSCode Extension API will be used to create these UI components:

1. **Activity Bar & Explorer Panels**: Implemented using `vscode.window.createTreeView` and `vscode.window.registerTreeDataProvider` to create custom tree views in the Explorer.

2. **Custom Editor**: Implemented using `vscode.window.registerCustomEditorProvider` to create a specialized editor for YouTrack issues and articles.

3. **Metadata Panel**: Implemented as part of the custom editor using the WebView API to display and edit issue attributes above the content.

4. **Search View**: Implemented using the `vscode.window.createWebviewPanel` API to create a custom input with autocompletion.

5. **Status Bar**: Implemented using `vscode.window.createStatusBarItem` to display connection information.

## 7. Future Interface Enhancements

Potential future interface improvements not included in the initial implementation:

- Advanced filtering options in the explorer view
- Custom themes for YouTrack content
- Drag and drop for issue relationships
- Interactive issue timeline view
- Offline mode with visual indicators
- Integration with VSCode's built-in source control views for development tasks
