import { apiRequest } from './client'
import { User, UserCreate, UserUpdate } from '@/types'

export const usersApi = {
  // Create new user (registration)
  create: async (data: UserCreate): Promise<User> => {
    return apiRequest<User>({
      method: 'POST',
      url: '/api/v1/users/',
      data,
    })
  },

  // Get user by ID
  getById: async (userId: number): Promise<User> => {
    return apiRequest<User>({
      method: 'GET',
      url: `/api/v1/users/${userId}`,
    })
  },

  // Get all users with filters
  getAll: async (params?: {
    skip?: number
    limit?: number
    only_active?: boolean
  }): Promise<User[]> => {
    return apiRequest<User[]>({
      method: 'GET',
      url: '/api/v1/users/',
      params,
    })
  },

  // Update current user
  updateCurrent: async (data: UserUpdate): Promise<User> => {
    return apiRequest<User>({
      method: 'PATCH',
      url: '/api/v1/users/me',
      data,
    })
  },

  // Update user by ID (superuser only)
  update: async (userId: number, data: UserUpdate): Promise<User> => {
    return apiRequest<User>({
      method: 'PUT',
      url: `/api/v1/users/${userId}`,
      data,
    })
  },

  // Activate user
  activate: async (userId: number): Promise<User> => {
    return apiRequest<User>({
      method: 'PATCH',
      url: `/api/v1/users/${userId}/activate`,
    })
  },

  // Deactivate current user
  deactivateCurrent: async (): Promise<User> => {
    return apiRequest<User>({
      method: 'PATCH',
      url: '/api/v1/users/me/deactivate',
    })
  },

  // Deactivate user by ID
  deactivate: async (userId: number): Promise<User> => {
    return apiRequest<User>({
      method: 'PATCH',
      url: `/api/v1/users/${userId}/deactivate`,
    })
  },

  // Delete user
  delete: async (userId: number): Promise<void> => {
    return apiRequest<void>({
      method: 'DELETE',
      url: `/api/v1/users/${userId}`,
    })
  },

  // Search users
  search: async (
    searchTerm: string,
    params?: { skip?: number; limit?: number }
  ): Promise<User[]> => {
    return apiRequest<User[]>({
      method: 'GET',
      url: `/api/v1/users/search/${searchTerm}`,
      params,
    })
  },
}
