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
- **Status**: ✅ Completed (April 21, 2025)

## Task 4.2: Implement "Open in Editor" Context Actions
- **ID**: TASK-4.2
- **Description**: Create mechanisms to track and visualize synchronization status between local files and YouTrack.
- **Dependencies**: TASK-4.1
- **Acceptance Criteria**:
  - Add "Open in Editor" action to issue/article preview
  - Show sync status indicator text coloring for files in the Projects panel:
    - "Synced" when file content matches server content (green circle icon and white text)
    - "Modified" when local changes exist (filled circle icon and yellow text)
    - "Outdated" when remote content is newer (short arrow icon and gray text)
    - "Conflict" when both local and remote content changed (warning icon and red text)
  - Add context menu actions for each file:
    - "Fetch from YouTrack" (refresh local content from server)
    - "Save to YouTrack" (upload local changes to server)
    - "Unlink" (remove file from temp directory and project panel)
  - Implement "Save to YouTrack" functionality that updates only content
  - Implement "Unlink" functionality to clean up temporary files
  - Implement "Fetch from YouTrack" functionality to update local content from server
  - Add integration tests for all actions
- **Estimated Effort**: Large
- **Priority**: P1

## Task 4.3: Implement Metadata sync
- **ID**: TASK-4.3
- **Description**: Support custom fields in metadata and autosync.
- **Dependencies**: TASK-4.1, TASK-4.2
- **Acceptance Criteria**:
  - Add configuration for list of custom fields in metadata
  - Support issues links (depends on, relates to, etc) and all custom fields (based on configuration) in metadata
  - Add sync interval configuration option for sync status update and autosync
  - Implement interval-based autosync for content and metadata from YouTrack to `.yt` files (if no conflicts)
  - Implement YAML frontmatter parsing and generation for entity metadata
  - Support updating both content and key metadata fields when saving to YouTrack
  - Add integration tests for metadata sync
- **Estimated Effort**: Medium
- **Priority**: P1

## Task 4.4: Implement Conflict Resolution
- **ID**: TASK-4.4
- **Description**: Implement conflict resolution between local files and YouTrack entities.
- **Dependencies**: TASK-4.2, TASK-4.3
- **Acceptance Criteria**:
  - Add "Resolve conflicts" action to files with conflicts to resolve conflicts
  - Git like resolve conflicts view (with selection of local, remote, or both)
  - Add "Compare with original" action to see side by side comparison of local and remote files.
  - Implement "Compare with original" to open side by side comparison of local and remote files.
  - Add integration tests for conflict resolution
- **Estimated Effort**: Medium
- **Priority**: P1
