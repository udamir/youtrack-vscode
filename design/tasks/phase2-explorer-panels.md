# Phase 2: Explorer Panels Implementation

## Task 2.1: Create Base Tree View Infrastructure
- **ID**: TASK-2.1
- **Description**: Implement base classes and infrastructure for creating tree views in the explorer panel.
- **Dependencies**: TASK-1.6
- **Acceptance Criteria**:
  - Base tree data provider class
  - Tree item base class with common functionality
  - Refresh mechanism implementation
  - Context value setting for command enablement
  - Icon resolution for tree items
- **Estimated Effort**: Medium
- **Priority**: P0
- **Status**: ✅ Completed (April 9, 2025)

## Task 2.2: Implement Projects Panel
- **ID**: TASK-2.2
- **Description**: Create the Projects panel showing manually added YouTrack projects with add/remove functionality and single-select behavior.
- **Dependencies**: TASK-2.1
- **Acceptance Criteria**:
  - Projects tree view registered in package.json
  - Projects tree data provider implementation
  - Project tree item representation with icons
  - "Add Project" button in panel title with project selector dialog
  - Context menu item for removing projects from the panel
  - Project list persistence across sessions using workspace state
  - Single-select behavior implementation
  - Refresh button in panel title
  - Event emission when selected project changes
  - Local cache of selected projects
- **Estimated Effort**: Medium
- **Priority**: P0
- **Status**: ✅ Completed (April 10, 2025)

## Task 2.3: Implement Issues Panel
- **ID**: TASK-2.3
- **Description**: Create the Issues panel showing issues for the currently selected project with filter and view mode options.
- **Dependencies**: TASK-2.2
- **Acceptance Criteria**:
  - Issues tree view registered in package.json
  - Issues tree data provider implementation
  - Filter input box in panel header
  - Toggle button for list/tree view modes
  - Issue tree item representation with ID, summary, and description
  - Issue tree item with customizable fields (e.g., assignee, priority, tags)
  - Special formatting for issues:
    - Resolved issues shown with strikethrough formatting and gray text color
    - Bug issues shown with dark red text color
    - Type-specific icons for Bug, Task, Feature, and Epic issue types
  - Panel updates when selected project changes
  - Proper handling of empty state when no project is selected
- **Estimated Effort**: Large
- **Priority**: P0
- **Status**: ✅ Completed (April 13, 2025)

## Task 2.4: Implement Knowledge Base Panel
- **ID**: TASK-2.4
- **Description**: Create the Knowledge Base panel showing articles in a hierarchical structure for the selected project.
- **Dependencies**: TASK-2.2
- **Acceptance Criteria**:
  - Knowledge Base tree view registered in package.json
  - Article tree data provider implementation
  - Proper handling of article hierarchy with folders
  - Article tree item representation with icons and titles
  - Panel updates when selected project changes
  - Empty state handling when no project is selected
- **Estimated Effort**: Medium
- **Priority**: P0
- **Status**: ✅ Completed (April 13, 2025)

## Task 2.5 Implement Issues and Articles preview as Markdown in WebView
- **ID**: TASK-2.5
- **Description**: Create the preview of issues and articles as Markdown content.
- **Dependencies**: TASK-2.3, TASK-2.4
- **Acceptance Criteria**:
  - Markdown rendering for issue and article content
  - Support for Mermaid diagrams in preview
  - Preview should be triggered when the user selects an issue/article, not automatically
  - Interactive internal links (e.g., to other issues or articles) in preview mode
    - Internal links should be parsed based on project shortName cache in advance
    - Internal links should open in a new preview tab when clicked
  - Read-only view of issue/content (no content caching)
  - Support for issue/content formatting
  - Refresh action to update content from YouTrack
  - Error handling for content that fails to load
  - WebView persistence for better performance
  - Support for task lists (checkboxes) in Markdown content
  - Proper theme detection for Mermaid diagrams to adapt to VS Code theme
  - Title truncation to improve readability in tab titles
  - Clean code organization with minimal duplication
- **Estimated Effort**: Medium
- **Priority**: P0
- **Status**: ✅ Completed (April 13, 2025)

### Task 2.6 Refactoring of extension file
- **Description**: Major refactoring of the extension's codebase to improve organization, maintainability, and testability.
- **Dependencies**: TASK-2.5
- **Acceptance Criteria**:
  - Reorganize code into a modular folder structure with proper component isolation
  - Implement a dedicated ViewService to centralize view-related operations
  - Introduce consistent file naming conventions across the codebase
  - Improve test infrastructure with proper VS Code API mocking
  - Fix issues with file decoration provider handling
  - Enhance error handling in tree view components
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: ✅ Completed (April 19, 2025)

### Task 2.6.1 Folder Structure Reorganization
- **ID**: TASK-2.6.1
- **Description**: Reorganize the codebase into a modular folder structure with clear component boundaries.
- **Dependencies**: TASK-2.5
- **Acceptance Criteria**:
  - Group related files into logical folders (services, views, utils)
  - Create specialized sub-folders for each major component (issues, articles, projects)
  - Implement index.ts files for clean module exports
  - Separate tree items, tree views, and related utilities
  - Move constants into their relevant component folders
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: ✅ Completed (April 19, 2025)

### Task 2.6.2 View Management Implementation
- **ID**: TASK-2.6.2
- **Description**: Implement a dedicated ViewService to centralize view-related state and operations.
- **Dependencies**: TASK-2.6.1
- **Acceptance Criteria**:
  - Create ViewService as the central hub for views communication
  - Implement event emitters for cross-component notifications
  - Centralize active project state management
  - Provide refresh capabilities for all views
  - Improve error handling for UI components
- **Estimated Effort**: Small
- **Priority**: P1
- **Status**: ✅ Completed (April 19, 2025)

### Task 2.6.3 Test Infrastructure Enhancement
- **ID**: TASK-2.6.3
- **Description**: Improve the test infrastructure to support the refactored codebase.
- **Dependencies**: TASK-2.6.2
- **Acceptance Criteria**:
  - Update mock implementations for VS Code APIs
  - Implement proper file decoration provider mocking
  - Enhance test setup for tree view components
  - Fix test failures related to component changes
  - Ensure all tests pass with the new architecture
- **Estimated Effort**: Small
- **Priority**: P1
- **Status**: ✅ Completed (April 19, 2025)

## Task 2.7: Implement Recent Issues Panel
- **ID**: TASK-2.7
- **Description**: Create the Recent Issues panel showing recently accessed issues across all projects.
- **Dependencies**: TASK-2.1
- **Acceptance Criteria**:
  - Recent Issues tree view registered in package.json
  - Recent Issues data provider implementation
  - Storage mechanism for tracking recently viewed issues
  - Issue tree item with ID, summary, and timestamp
  - Configurable limit for number of recent items to display
  - Recent issues persistence across sessions
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: 📝 Planned

## Task 2.8: Implement Recent Articles Panel
- **ID**: TASK-2.8
- **Description**: Create the Recent Articles panel showing recently accessed articles across all projects.
- **Dependencies**: TASK-2.1
- **Acceptance Criteria**:
  - Recent Articles tree view registered in package.json
  - Recent Articles data provider implementation
  - Storage mechanism for tracking recently viewed articles
  - Article tree item with title and timestamp
  - Configurable limit for number of recent items to display
  - Recent articles persistence across sessions
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: 📝 Planned

## Task 2.9: Implement Context Menus for Tree Items
- **ID**: TASK-2.9
- **Description**: Create context menus for all tree item types with relevant actions.
- **Dependencies**: TASK-2.2, TASK-2.3, TASK-2.4, TASK-2.7, TASK-2.8
- **Acceptance Criteria**:
  - Context menu registrations in package.json
  - Command handlers for each context menu action
  - Project context menu: Open in browser, Refresh, etc.
  - Issue context menu: Open, Copy ID, Copy Link, etc.
  - Article context menu: Open, Copy Link, etc.
  - Context value-based enablement of menu items
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: 📝 Planned

## Task 2.10: Enhance Issues Panel with Issue Filters
- **ID**: TASK-2.10
- **Description**: Add support for different issue filters in the Issues panel: by types (Epic, Feature, Task, Bug) and by resolution status.
- **Dependencies**: TASK-2.3
- **Acceptance Criteria**:
  - Type-specific icons for issues based on their type
  - Quick filter buttons for each issue type in the panel header
  - Toggle button to hide/show resolved issues
  - Priority indicators with color coding:
    - 🔴 Critical (Red)
    - 🟠 Major (Orange)
    - 🟢 Normal (Green)
    - 🔵 Minor (Blue)
  - Update YouTrack client to fetch issue type information and priority data
  - Support for filtering issues by type and resolution status
  - Visual indication of active filters
  - Persistence of filter preferences across sessions
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: 📝 Planned

## Task 2.11: Implement Saved Search Support in Projects Panel
- **ID**: TASK-2.11
- **Description**: Add support for saved searches in the Projects panel.
- **Dependencies**: TASK-2.2
- **Acceptance Criteria**:
  - "Add Saved Search" button in the Projects panel
  - Organize Projects panel into collapsible sections for Projects and Saved Searches
  - Allow selecting a saved search to display matching issues in the Issues panel
  - Context menu option to remove saved searches
  - Persistence of saved searches across sessions
  - Update YouTrack client to fetch and execute saved searches
- **Estimated Effort**: Medium
- **Priority**: P1
- **Status**: 📝 Planned

## Task 2.12: Implement Connection Messaging for Empty States
- **ID**: TASK-2.12
- **Description**: Create consistent messaging and UI elements for panels when connection is not configured or fails.
- **Dependencies**: TASK-2.11
- **Acceptance Criteria**:
  - Design consistent empty state UI for unconfigured connection
  - Design error state UI for failed connection
  - Include actionable buttons to resolve connection issues
  - Ensure accessibility of messages and actions
  - Consistent messaging across all panels
- **Estimated Effort**: Small
- **Priority**: P1
- **Status**: 📝 Planned
