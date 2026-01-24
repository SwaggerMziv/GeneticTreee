import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { ApiError } from '@/types'
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuthTokens } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh tokens
        const response = await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            {},
            {
            withCredentials: true, // Always send cookies (refresh token might be there)
              headers: {
                'Content-Type': 'application/json',
              // Add refresh token from storage if available as fallback
              ...(getRefreshToken() ? { 'Authorization': `Bearer ${getRefreshToken()}` } : {})
            }
          }
        )

        const { access_token, refresh_token } = response.data

        // Update tokens in storage
        setAuthTokens(access_token, refresh_token || getRefreshToken())

        // Update authorization header for original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }

          return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear tokens and let the app handle logout
        clearAuthTokens()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Generic request wrapper with error handling
export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.request<T>(config)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = {
        detail: error.response?.data?.detail || error.message || 'An error occurred',
        status: error.response?.status,
      }
      throw apiError
    }
    throw error
  }
}

export { apiClient }
export default apiClient
