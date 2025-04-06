# Changelog

All notable changes to the "youtrack-vscode" extension will be documented in this file.

## [Unreleased]

### Added
- Initial extension setup
- Basic project structure
- Extension activation point
- Configuration settings structure
- Logger utility
- Constants for extension commands and views
- Implemented Secure Storage Service for credential management
  - Secure storage of YouTrack token using VSCode Secret Storage API
  - Encryption for sensitive data in memory
  - Comprehensive test coverage for storage functionality
- Modified YouTrack client to use the new Secure Storage Service
- Implemented Authentication Module
  - Support for permanent token authentication
  - Events for authentication state changes
  - Proper connection status handling and validation
  - Comprehensive test coverage for authentication flow

### Changed
- Migrated from ESLint to Biome for code linting and formatting
- Updated code style to use double quotes and omit semicolons
- Fixed extension activation entry point with proper error handling
- Improved TypeScript configuration with stricter type checking
