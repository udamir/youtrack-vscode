/**
 * Mock YouTrack data for tests
 */

import type { ProjectEntity, IssueEntity, ArticleEntity, UserEntity } from "../../src/views"

// Base URL for YouTrack server
export const mockBaseUrl = "https://youtrack.example.com"

// Mock auth token
export const mockToken = "mock-token-12345"

// Mock projects data
export const mockProjects: ProjectEntity[] = [
  {
    id: "project-1",
    name: "Test Project",
    shortName: "TEST",
    description: "Test project for unit tests",
  },
  {
    id: "project-2",
    name: "Another Project",
    shortName: "ANOTHER",
    description: "Another test project",
  },
]

// Mock issues data
export const mockIssues: IssueEntity[] = [
  {
    id: "issue-1",
    idReadable: "TEST-1",
    summary: "Test issue 1",
    description: "This is a test issue",
    resolved: 0,
    projectId: "project-1",
    subtasks: [],
    type: "Task",
    created: 1617235200000,
    updated: 1617235200000,
    attachments: {},
  },
  {
    id: "issue-2",
    idReadable: "TEST-2",
    summary: "Test issue 2",
    description: "This is another test issue",
    resolved: 1,
    projectId: "project-1",
    subtasks: [],
    type: "Bug",
    created: 1617235200000,
    updated: 1617235200000,
    attachments: {},
  },
]

// Mock articles data
export const mockArticles: ArticleEntity[] = [
  {
    id: "article-1",
    idReadable: "KB-A-1",
    summary: "Test article 1",
    content: "This is a test article",
    projectId: "project-1",
    childArticles: [],
    created: 1617235200000,
    updated: 1617235200000,
    attachments: {},
  },
  {
    id: "article-2",
    idReadable: "KB-A-2",
    summary: "Test article 2",
    content: "",
    projectId: "project-1",
    childArticles: [],
    created: 1617235200000,
    updated: 1617235200000,
    attachments: {},
  },
]

// Mock user data
export const mockUser: UserEntity = {
  id: "user-1",
  login: "admin",
  fullName: "Admin User",
  email: "admin@example.com",
}
