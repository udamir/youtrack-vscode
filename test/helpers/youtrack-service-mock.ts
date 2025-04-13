import type { YouTrackService } from "../../src/services/youtrack-client"

/**
 * Creates a mock YouTrack service with configurable baseUrl and server change event
 * @param baseUrl Base URL for the mock YouTrack service
 * @returns A mock YouTrack service object
 */
export function createMockYouTrackService(baseUrl: string): Partial<YouTrackService> {
  // Create server change event mock using Jest
  const mockOnServerChanged = jest.fn().mockImplementation((callback) => {
    return {
      dispose: jest.fn(),
    }
  })

  // Create and return mock YouTrack service
  return {
    baseUrl,
    onServerChanged: mockOnServerChanged,
  }
}
