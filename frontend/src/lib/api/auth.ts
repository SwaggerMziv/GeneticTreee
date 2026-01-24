import { apiRequest } from './client'
import {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  AccessTokenResponse,
  LogoutResponse,
  User,
  MeResponse,
  TelegramAuthData,
} from '@/types'
import { setAuthTokens, clearAuthTokens } from '@/lib/utils'

export const authApi = {
  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/api/v1/auth/login',
      data,
    })

    // Store tokens
    if (response.access_token && response.refresh_token) {
      setAuthTokens(response.access_token, response.refresh_token)
    }

    return response
  },

  // Refresh access token
  refresh: async (data?: RefreshRequest): Promise<AccessTokenResponse> => {
    return apiRequest<AccessTokenResponse>({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      data,
    })
  },

  // Get current user
  me: async (): Promise<User> => {
    return apiRequest<User>({
      method: 'GET',
      url: '/api/v1/auth/me',
    })
  },

  // Get current user ID (sub)
  meSub: async (): Promise<MeResponse> => {
    return apiRequest<MeResponse>({
      method: 'GET',
      url: '/api/v1/auth/me/sub',
    })
  },

  // Logout
  logout: async (): Promise<LogoutResponse> => {
    const response = await apiRequest<LogoutResponse>({
      method: 'DELETE',
      url: '/api/v1/auth/logout',
    })

    // Clear tokens
    clearAuthTokens()

    return response
  },

  // Telegram Login
  telegramAuth: async (data: TelegramAuthData): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/api/v1/auth/telegram',
      data,
    })

    // Store tokens
    if (response.access_token && response.refresh_token) {
      setAuthTokens(response.access_token, response.refresh_token)
    }

    return response
  },
}
