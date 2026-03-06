import { apiRequest } from './client'

// ==================== TYPES ====================

export interface AdminUserListItem {
  id: number
  username: string
  email: string | null
  telegram_id: string | null
  is_active: boolean
  is_superuser: boolean
  created_at: string
  relatives_count: number
  stories_count: number
  relationships_count: number
  activated_relatives_count: number
}

export interface AdminUserListResponse {
  users: AdminUserListItem[]
  total: number
  skip: number
  limit: number
}

export interface AdminDashboardStats {
  total_users: number
  active_users: number
  inactive_users: number
  total_relatives: number
  total_relationships: number
  total_stories: number
  total_activated_relatives: number
  total_invitations_sent: number
  users_registered_last_7_days: number
  users_registered_last_30_days: number
  avg_relatives_per_user: number
  top_users: AdminUserListItem[]
}

export interface AdminRelativeListItem {
  id: number
  user_id: number
  owner_username: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  is_active: boolean
  is_activated: boolean
  telegram_user_id: number | null
  stories_count: number
  created_at: string
}

export interface AdminStoryItem {
  relative_id: number
  relative_name: string
  owner_username: string
  user_id: number
  story_key: string
  story_text: string
  media_count: number
  media_urls: string[]
  created_at: string | null
}

export interface AdminActiveInterview {
  relative_id: number
  name: string
  owner_username: string
  messages_count: number
  last_message_at: string | null
}

export interface AdminTelegramStats {
  total_activated: number
  total_invitations_sent: number
  total_with_interviews: number
  total_pending_invitations: number
  stories_via_bot: number
  stories_manually: number
  active_interviews: AdminActiveInterview[]
}

export interface AdminAuditLogItem {
  id: number
  admin_user_id: number | null
  action: string
  target_type: string
  target_id: string
  ip_address: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface AdminAuditLogResponse {
  items: AdminAuditLogItem[]
  total: number
  skip: number
  limit: number
}

export interface AIUsageLogItem {
  id: number
  user_id: number | null
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  endpoint_type: string
  error_message: string | null
  created_at: string
}

export interface AIUsageLogResponse {
  items: AIUsageLogItem[]
  total: number
  skip: number
  limit: number
}

export interface AIUsageStats {
  total_calls: number
  total_tokens: number
  total_prompt_tokens: number
  total_completion_tokens: number
  estimated_cost_usd: number
  errors_count: number
  calls_by_type: Record<string, number>
}

export interface BookGenerationItem {
  id: number
  user_id: number | null
  status: string
  filename: string | null
  s3_key: string | null
  s3_url: string | null
  file_size_bytes: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface BookGenerationListResponse {
  items: BookGenerationItem[]
  total: number
  skip: number
  limit: number
}

export interface DayDataPoint {
  date: string
  count: number
}

export interface DashboardCharts {
  registrations_by_day: DayDataPoint[]
  active_users_by_day: DayDataPoint[]
}

export interface AdminAllRelativesResponse {
  relatives: AdminRelativeListItem[]
  total: number
  skip: number
  limit: number
}

export interface AdminTreeData {
  relatives: Array<{
    id: number
    user_id: number
    first_name: string | null
    middle_name: string | null
    last_name: string | null
    gender: string | null
    birth_date: string | null
    death_date: string | null
    image_url: string | null
    generation: number | null
    is_activated: boolean
    is_active: boolean
  }>
  relationships: Array<{
    id: number
    user_id: number
    from_relative_id: number
    to_relative_id: number
    relationship_type: string | null
    is_active: boolean
  }>
}

// ==================== API ====================

export const adminApi = {
  // Dashboard
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    return apiRequest<AdminDashboardStats>({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
    })
  },

  getDashboardCharts: async (): Promise<DashboardCharts> => {
    return apiRequest<DashboardCharts>({
      method: 'GET',
      url: '/api/v1/admin/dashboard/charts',
    })
  },

  // Users
  getUsers: async (params?: {
    skip?: number
    limit?: number
    search?: string
    only_active?: boolean
    date_from?: string
    date_to?: string
    sort_by?: string
  }): Promise<AdminUserListResponse> => {
    return apiRequest<AdminUserListResponse>({
      method: 'GET',
      url: '/api/v1/admin/users',
      params,
    })
  },

  getUserRelatives: async (userId: number): Promise<AdminRelativeListItem[]> => {
    return apiRequest<AdminRelativeListItem[]>({
      method: 'GET',
      url: `/api/v1/admin/users/${userId}/relatives`,
    })
  },

  getUserTree: async (userId: number): Promise<AdminTreeData> => {
    return apiRequest<AdminTreeData>({
      method: 'GET',
      url: `/api/v1/admin/users/${userId}/tree`,
    })
  },

  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    return apiRequest<void>({
      method: 'POST',
      url: `/api/v1/admin/users/${userId}/reset-password`,
      data: { new_password: newPassword },
    })
  },

  // All relatives
  getAllRelatives: async (params?: {
    skip?: number
    limit?: number
    user_id?: number
    gender?: string
    is_activated?: boolean
    has_stories?: boolean
  }): Promise<AdminAllRelativesResponse> => {
    return apiRequest<AdminAllRelativesResponse>({
      method: 'GET',
      url: '/api/v1/admin/relatives',
      params,
    })
  },

  // Stories
  getStories: async (params?: {
    skip?: number
    limit?: number
    user_id?: number
  }): Promise<AdminStoryItem[]> => {
    return apiRequest<AdminStoryItem[]>({
      method: 'GET',
      url: '/api/v1/admin/stories',
      params,
    })
  },

  deleteStory: async (relativeId: number, storyKey: string): Promise<void> => {
    return apiRequest<void>({
      method: 'DELETE',
      url: `/api/v1/admin/relatives/${relativeId}/stories/${encodeURIComponent(storyKey)}`,
    })
  },

  // Telegram
  getTelegramStats: async (): Promise<AdminTelegramStats> => {
    return apiRequest<AdminTelegramStats>({
      method: 'GET',
      url: '/api/v1/admin/telegram',
    })
  },

  // Audit logs
  getAuditLogs: async (params?: {
    skip?: number
    limit?: number
    action?: string
    date_from?: string
    date_to?: string
  }): Promise<AdminAuditLogResponse> => {
    return apiRequest<AdminAuditLogResponse>({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      params,
    })
  },

  // AI usage
  getAiUsage: async (params?: {
    skip?: number
    limit?: number
    user_id?: number
    endpoint_type?: string
    date_from?: string
    date_to?: string
  }): Promise<AIUsageLogResponse> => {
    return apiRequest<AIUsageLogResponse>({
      method: 'GET',
      url: '/api/v1/admin/ai/usage',
      params,
    })
  },

  getAiStats: async (): Promise<AIUsageStats> => {
    return apiRequest<AIUsageStats>({
      method: 'GET',
      url: '/api/v1/admin/ai/stats',
    })
  },

  // Books
  getBooks: async (params?: {
    skip?: number
    limit?: number
    user_id?: number
  }): Promise<BookGenerationListResponse> => {
    return apiRequest<BookGenerationListResponse>({
      method: 'GET',
      url: '/api/v1/admin/books',
      params,
    })
  },

  deleteBook: async (bookId: number): Promise<void> => {
    return apiRequest<void>({
      method: 'DELETE',
      url: `/api/v1/admin/books/${bookId}`,
    })
  },
}
