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
  - Issue tree item representation with ID and summary
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

## Task 2.5: Implement Recent Issues Panel
- **ID**: TASK-2.5
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

## Task 2.6: Implement Recent Articles Panel
- **ID**: TASK-2.6
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

## Task 2.7: Implement Context Menus for Tree Items
- **ID**: TASK-2.7
- **Description**: Create context menus for all tree item types with relevant actions.
- **Dependencies**: TASK-2.2, TASK-2.3, TASK-2.4, TASK-2.5, TASK-2.6
- **Acceptance Criteria**:
  - Context menu registrations in package.json
  - Command handlers for each context menu action
  - Project context menu: Open in browser, Refresh, etc.
  - Issue context menu: Open, Copy ID, Copy Link, etc.
  - Article context menu: Open, Copy Link, etc.
  - Context value-based enablement of menu items
- **Estimated Effort**: Medium
- **Priority**: P1

## Task 2.8: Implement Panel State Persistence
- **ID**: TASK-2.8
- **Description**: Ensure panel state (expanded/collapsed, selected items) persists across sessions.
- **Dependencies**: TASK-2.2, TASK-2.3, TASK-2.4, TASK-2.5, TASK-2.6
- **Acceptance Criteria**:
  - Selected project persistence
  - Panel expansion state persistence
  - View mode preference persistence
  - Restoration of state on extension activation
  - Memory-efficient storage of panel state
- **Estimated Effort**: Small
- **Priority**: P2

## Task 2.9: Implement Configuration Status Detection in Explorer
- **ID**: TASK-2.9
- **Description**: Create a mechanism to detect the configuration status and manage the visibility of the "Setup Connection" button in the Explorer view.
- **Dependencies**: TASK-1.14, TASK-2.2
- **Acceptance Criteria**:
  - Configuration detection service that integrates with explorer panels
  - Dynamic visibility of setup button based on configuration state
  - Proper handling of connection changes (setup/disconnect events)
  - Performance optimized state detection to avoid UI lagging
  - Event system for notifying panels of configuration changes
- **Estimated Effort**: Small
- **Priority**: P0

## Task 2.10: Implement Connection Messaging for Empty States
- **ID**: TASK-2.10
- **Description**: Create consistent messaging and UI elements for panels when connection is not configured or fails.
- **Dependencies**: TASK-2.9
- **Acceptance Criteria**:
  - Design consistent empty state UI for unconfigured connection
  - Design error state UI for failed connection
  - Include actionable buttons to resolve connection issues
  - Ensure accessibility of messages and actions
  - Consistent messaging across all panels
- **Estimated Effort**: Small
- **Priority**: P1
