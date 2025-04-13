/**
 * Helper class for YouTrack testing with direct API access
 * Provides utilities for CRUD operations on YouTrack entities
 */
import type { ProjectEntity, IssueEntity } from "../../src/models"
import type { YouTrack } from "youtrack-client"
import { ISSUE_FIELDS, PROJECT_FIELDS, USER_PROFILE_FIELDS } from "../../src/consts"
import { getIssueEntity } from "../../src/utils/youtrack"

/**
 * Helper class for YouTrack testing
 * Uses youtrack-client library directly for CRUD operations
 */
export class YouTrackHelper {
  public createdProjects: ProjectEntity[] = []
  public createdIssues: IssueEntity[] = []

  constructor(public client: YouTrack) {}

  // Auth and user operations

  public async getCurrentUser() {
    return this.client.Users.getCurrentUserProfile({ fields: USER_PROFILE_FIELDS })
  }

  // PROJECT OPERATIONS

  public async getProjects() {
    return this.client.Admin.Projects.getProjects({ fields: PROJECT_FIELDS })
  }

  public async getProjectById(id: string) {
    return this.client.Admin.Projects.getProjectById(id, { fields: PROJECT_FIELDS })
  }

  public async createProject(project: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const me = await this.client.Users.getCurrentUserProfile({ fields: USER_PROFILE_FIELDS })
    if (!me) {
      throw new Error("Failed to create project: current user profile not found")
    }

    const createdProject = (await this.client.Admin.Projects.createProject(
      {
        name: project.name || `Test Project ${Date.now()}`,
        shortName: project.shortName || `TP${Date.now()}`,
        leader: { id: me.id } as any,
        description: project.description || "Test project for integration tests",
      },
      { fields: PROJECT_FIELDS },
    )) as ProjectEntity

    // Track created projects for cleanup
    this.createdProjects.push(createdProject)
    return createdProject
  }

  public async deleteProject(id: string) {
    await this.client.Admin.Projects.deleteProject(id)
    this.createdProjects = this.createdProjects.filter((p) => p.id !== id)
  }

  // ISSUE OPERATIONS

  public async getIssues(projectShortName: string) {
    return this.client.Issues.getIssues({
      query: `project: ${projectShortName}`,
      customFields: [],
      fields: ISSUE_FIELDS,
    })
  }

  public async getIssueById(id: string) {
    return this.client.Issues.getIssueById(id, { fields: ISSUE_FIELDS })
  }

  public async createIssue(projectId: string, issue: Partial<IssueEntity> = {}): Promise<IssueEntity> {
    const createdIssue = await this.client.Issues.createIssue(
      {
        summary: issue.summary || `Test issue ${Date.now()}`,
        description: issue.description || "Test issue for integration tests",
        project: { id: projectId } as any,
        ...issue,
      },
      { fields: ISSUE_FIELDS },
    )

    // Track created issues for cleanup
    const issueEntity = getIssueEntity(createdIssue)
    this.createdIssues.push(issueEntity)
    return issueEntity
  }

  public async deleteIssue(id: string) {
    await this.client.Issues.deleteIssue(id)
    this.createdIssues = this.createdIssues.filter((i) => i.id !== id)
  }

  public async updateIssue(id: string, issue: Partial<IssueEntity> = {}): Promise<IssueEntity> {
    const updatedIssue = await this.client.Issues.updateIssue(id, issue as any, {
      fields: ISSUE_FIELDS,
    })
    return getIssueEntity(updatedIssue)
  }

  // CLEANUP

  public async cleanup() {
    // Delete all created issues
    for (const issue of this.createdIssues) {
      try {
        await this.deleteIssue(issue.id)
      } catch (error) {
        console.error(`Failed to delete issue ${issue.id}:`, error)
      }
    }

    // Delete all created projects
    for (const project of this.createdProjects) {
      try {
        await this.deleteProject(project.id)
      } catch (error) {
        console.error(`Failed to delete project ${project.id}:`, error)
      }
    }
  }
}
