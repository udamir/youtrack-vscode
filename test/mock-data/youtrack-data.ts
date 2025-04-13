import type { ProjectEntity, IssueEntity, ArticleEntity } from "../../src/models"

// Mock server URL
export const mockBaseUrl = "https://youtrack.example.com"

// Mock projects data
export const mockProjects: ProjectEntity[] = [
  { id: "project1", name: "Project 1", shortName: "P1", description: "Description 1" },
  { id: "project2", name: "Project 2", shortName: "P2", description: "Description 2" }
]

// Mock issues data
export const mockIssues: IssueEntity[] = [
  { 
    id: "issue1", 
    idReadable: "P1-1", 
    summary: "Issue 1", 
    description: "Description 1", 
    resolved: 0, 
    projectId: "project1", 
    created: Date.now(), 
    updated: Date.now(),
    subtasks: []
  },
  { 
    id: "issue2", 
    idReadable: "P1-2", 
    summary: "Issue 2", 
    description: "Description 2", 
    resolved: 0, 
    projectId: "project1", 
    created: Date.now(), 
    updated: Date.now(),
    subtasks: []
  }
]

// Mock articles data
export const mockArticles: ArticleEntity[] = [
  { 
    id: "article1", 
    idReadable: "KB-1", 
    summary: "Article 1", 
    content: "Content 1", 
    updated: Date.now(), 
    created: Date.now() - 10000, 
    projectId: "project1", 
    childArticles: [] 
  },
  { 
    id: "article2", 
    idReadable: "KB-2", 
    summary: "Article 2", 
    content: "Content 2", 
    updated: Date.now(), 
    created: Date.now() - 20000, 
    projectId: "project1", 
    childArticles: [] 
  }
]
