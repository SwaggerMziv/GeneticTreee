import { apiRequest, apiClient } from './client'
import {
  FamilyRelative,
  FamilyRelativeCreate,
  FamilyRelativeUpdate,
  FamilyRelationship,
  FamilyRelationshipCreate,
  FamilyRelationshipUpdate,
  FamilyStatistics,
  Story,
  StoryCreate,
  StoryUpdate,
  StoryMediaUploadResponse,
  InvitationResponse,
} from '@/types'

// Family relatives API
export const familyApi = {
  // Get all relatives
  getRelatives: (userId: number, onlyActive = true): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives`,
      params: { only_active: onlyActive },
    }),

  // Get single relative
  getRelative: (userId: number, relativeId: number): Promise<FamilyRelative> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/${relativeId}`,
    }),

  // Create relative
  createRelative: (userId: number, data: FamilyRelativeCreate): Promise<FamilyRelative> =>
    apiRequest({
      method: 'POST',
      url: `/api/v1/family/${userId}/relatives`,
      data,
    }),

  // Update relative
  updateRelative: (
    userId: number,
    relativeId: number,
    data: FamilyRelativeUpdate
  ): Promise<FamilyRelative> =>
    apiRequest({
      method: 'PUT',
      url: `/api/v1/family/${userId}/relatives/${relativeId}`,
      data,
    }),

  // Delete relative
  deleteRelative: (userId: number, relativeId: number): Promise<void> =>
    apiRequest({
      method: 'DELETE',
      url: `/api/v1/family/${userId}/relatives/${relativeId}`,
    }),

  // Get alive relatives
  getAliveRelatives: (userId: number): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/alive`,
    }),

  // Get deceased relatives
  getDeceasedRelatives: (userId: number): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/deceased`,
    }),

  // Get activated (connected to Telegram) relatives
  getActivatedRelatives: (userId: number): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/activated`,
    }),

  // Get not activated (not connected to Telegram) relatives
  getNotActivatedRelatives: (userId: number): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/not-activated`,
    }),

  // Search relatives
  searchRelatives: (userId: number, searchTerm: string): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/search/${searchTerm}`,
    }),

  // Get relatives by gender
  getRelativesByGender: (userId: number, gender: string): Promise<FamilyRelative[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/gender/${gender}`,
    }),

  // Update relative context (add key-value pair)
  updateContext: (
    userId: number,
    relativeId: number,
    key: string,
    value: string
  ): Promise<boolean> =>
    apiRequest({
      method: 'PATCH',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/context`,
      data: { key, value },
    }),

  // Get relative context
  getContext: (userId: number, relativeId: number): Promise<{ context: Record<string, string> }> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/context`,
    }),

  // Generate invitation link for a relative
  generateInvitation: (userId: number, relativeId: number): Promise<InvitationResponse> =>
    apiRequest({
      method: 'POST',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/generate-invitation`,
    }),
}

// Family relationships API
export const relationshipApi = {
  // Get all relationships
  getRelationships: (userId: number, withDetails = false): Promise<FamilyRelationship[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relationships`,
      params: { with_details: withDetails },
    }),

  // Get single relationship
  getRelationship: (userId: number, relationshipId: number): Promise<FamilyRelationship> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relationships/${relationshipId}`,
    }),

  // Create relationship
  createRelationship: (
    userId: number,
    data: FamilyRelationshipCreate
  ): Promise<FamilyRelationship> =>
    apiRequest({
      method: 'POST',
      url: `/api/v1/family/${userId}/relationships`,
      data,
    }),

  // Update relationship
  updateRelationship: (
    userId: number,
    relationshipId: number,
    data: FamilyRelationshipUpdate
  ): Promise<FamilyRelationship> =>
    apiRequest({
      method: 'PUT',
      url: `/api/v1/family/${userId}/relationships/${relationshipId}`,
      data,
    }),

  // Delete relationship
  deleteRelationship: (userId: number, relationshipId: number): Promise<void> =>
    apiRequest({
      method: 'DELETE',
      url: `/api/v1/family/${userId}/relationships/${relationshipId}`,
    }),

  // Get family tree
  getFamilyTree: (userId: number): Promise<FamilyRelationship[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/family-tree`,
    }),

  // Get children
  getChildren: (userId: number, parentId: number): Promise<FamilyRelationship[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relationships/children/${parentId}`,
    }),

  // Get parents
  getParents: (userId: number, childId: number): Promise<FamilyRelationship[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relationships/parents/${childId}`,
    }),

  // Get siblings
  getSiblings: (userId: number, relativeId: number): Promise<FamilyRelationship[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relationships/siblings/${relativeId}`,
    }),
}

// Statistics API
export const statisticsApi = {
  // Get family statistics
  getStatistics: (userId: number): Promise<FamilyStatistics> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/statistics`,
    }),
}

// Stories API
export const storiesApi = {
  // Get all stories for a relative
  getStories: (userId: number, relativeId: number): Promise<Story[]> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories`,
    }),

  // Get single story
  getStory: (userId: number, relativeId: number, storyKey: string): Promise<Story> =>
    apiRequest({
      method: 'GET',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}`,
    }),

  // Create story
  createStory: (userId: number, relativeId: number, data: StoryCreate): Promise<Story> =>
    apiRequest({
      method: 'POST',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories`,
      data,
    }),

  // Update story
  updateStory: (
    userId: number,
    relativeId: number,
    storyKey: string,
    data: StoryUpdate
  ): Promise<Story> =>
    apiRequest({
      method: 'PUT',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}`,
      data,
    }),

  // Delete story
  deleteStory: (userId: number, relativeId: number, storyKey: string): Promise<void> =>
    apiRequest({
      method: 'DELETE',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}`,
    }),

  // Upload media to story
  uploadMedia: async (
    userId: number,
    relativeId: number,
    storyKey: string,
    file: File
  ): Promise<StoryMediaUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<StoryMediaUploadResponse>(
      `/api/v1/family/${userId}/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}/media`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Delete media from story
  deleteMedia: (
    userId: number,
    relativeId: number,
    storyKey: string,
    mediaUrl: string
  ): Promise<void> =>
    apiRequest({
      method: 'DELETE',
      url: `/api/v1/family/${userId}/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}/media`,
      params: { media_url: mediaUrl },
    }),
}
