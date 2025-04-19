# Phase 4: YouTrack Content Editor Implementation

## Overview
This phase focuses on implementing a robust editor experience for YouTrack content (issues and articles) that allows users to edit content directly in VS Code and synchronize changes with YouTrack.

The editor implementation will use temporary local files with a structured format that includes both metadata and content, with appropriate synchronization mechanisms to keep local and remote content in sync.

## File Format
YouTrack content will be represented as `.yt` files with the following structure:
- Filename format: `[idReadable].yt` (e.g., `PROJECT-123.yt` for issues, `KB-456.yt` for articles)
- Content structure:
  - YAML frontmatter section containing metadata (ID, summary, project, status, assignee, etc.)
  - Markdown content section containing the description/content

## Task 4.1: Create Edit File Infrastructure
- **ID**: TASK-4.1
- **Description**: Set up the infrastructure for editing YouTrack content using standard file editor.
- **Dependencies**: TASK-1.6, TASK-2.5
- **Acceptance Criteria**:
  - Configuration option for temporary file storage location
  - Disable editor functionality when temp storage is not configured
  - File associations for `.yt` content
  - Create commands to edit YouTrack issues and articles by idReadable, which should create `.yt` files and open them in the standard file editor
  - Generate properly formatted `.yt` files when creating from issues or articles
  - Display local `.yt` files as children under their respective projects in the Projects panel (Add project to selected project if it was not added)
  - Add settings action button to Projects panel to open extension settings
- **Estimated Effort**: Medium
- **Priority**: P0

## Task 4.2: Implement "Open in Editor" Context Actions
- **ID**: TASK-4.2
- **Description**: Add context menu actions to open issues and articles in the standard file editor from various views.
- **Dependencies**: TASK-4.1
- **Acceptance Criteria**:
  - Add "Open in Editor" action to issue context menu in Issues and Recent Issues views
  - Add "Open in Editor" action to article context menu in Knowledge Base and Recent Articles views
  - Ensure proper error handling when file creation fails
  - Add visual indicators to show that content is being edited locally
- **Estimated Effort**: Medium
- **Priority**: P0

## Task 4.3: Implement Sync Status Management
- **ID**: TASK-4.3
- **Description**: Create mechanisms to track and visualize synchronization status between local files and YouTrack.
- **Dependencies**: TASK-4.1
- **Acceptance Criteria**:
  - Show sync status indicator for files in the Projects panel:
    - "Synced" when file content matches server content
    - "Modified" when local changes exist
    - "Conflict" when both local and remote content changed
  - Add context menu actions for each file:
    - "Fetch from YouTrack" (refresh local content from server)
    - "Save to YouTrack" (upload local changes to server)
    - "Unlink" (remove file from temp directory and project panel)
  - Implement two-way synchronization logic (local ↔ remote)
  - Handle conflict scenarios appropriately
- **Estimated Effort**: Large
- **Priority**: P1

## Task 4.4: Implement File Format and Parsing
- **ID**: TASK-4.4
- **Description**: Implement YAML frontmatter handling and content synchronization.
- **Dependencies**: TASK-4.1
- **Acceptance Criteria**:
  - Implement YAML frontmatter parsing and generation for entity metadata
  - Parse updated files to extract changes to both metadata and content
  - Handle entity-specific metadata fields appropriately (different for issues vs articles)
  - Support updating both content and key metadata fields when saving to YouTrack
- **Estimated Effort**: Medium
- **Priority**: P1

## Task 4.5: Implement Content Synchronization
- **ID**: TASK-4.5
- **Description**: Implement synchronization between local files and YouTrack entities.
- **Dependencies**: TASK-4.3, TASK-4.4
- **Acceptance Criteria**:
  - Implement "Save to YouTrack" functionality that updates both attributes and content
  - Implement "Fetch from YouTrack" to update local file with remote changes
  - Provide visual feedback during sync operations
  - Handle and report synchronization errors appropriately
  - Detect conflicts between local and remote changes
  - Clean up temporary files when they are unlinked or when editor is closed
  - Track open files to restore editing session across IDE restarts
- **Estimated Effort**: Large
- **Priority**: P1
