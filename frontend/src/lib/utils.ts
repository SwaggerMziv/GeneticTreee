import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 32) {
    errors.push('Password must not exceed 32 characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateUsername(username: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  }

  if (username.length > 20) {
    errors.push('Username must not exceed 20 characters')
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token')
  }
  return null
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token')
  }
  return null
}

export function clearAuthTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/**
 * Converts technical error messages to user-friendly Russian messages
 */
export function getErrorMessage(error: any): string {
  // Handle network errors
  if (!error.status && (error.detail === 'Network Error' || error.message === 'Network Error')) {
    return 'Не удалось подключиться к серверу. Проверьте подключение к интернету.'
  }

  // Handle specific HTTP status codes
  const statusMessages: Record<number, string> = {
    400: 'Неверные данные. Проверьте правильность введенной информации.',
    401: 'Неверные учетные данные. Проверьте логин и пароль.',
    403: 'Доступ запрещен. У вас нет прав для выполнения этого действия.',
    404: 'Запрошенный ресурс не найден.',
    409: 'Конфликт данных. Возможно, такой пользователь уже существует.',
    422: 'Ошибка валидации данных. Проверьте правильность заполнения формы.',
    429: 'Слишком много запросов. Пожалуйста, подождите немного.',
    500: 'Внутренняя ошибка сервера. Попробуйте позже.',
    502: 'Сервер временно недоступен. Попробуйте позже.',
    503: 'Сервис временно недоступен. Попробуйте позже.',
  }

  if (error.status && statusMessages[error.status]) {
    return statusMessages[error.status]
  }

  // Try to extract meaningful message from error detail
  if (error.detail) {
    const detail = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)

    // Common backend error patterns
    if (detail.includes('already exists') || detail.includes('duplicate')) {
      return 'Такой пользователь уже существует. Попробуйте другое имя пользователя или email.'
    }

    if (detail.includes('not found')) {
      return 'Запрошенные данные не найдены.'
    }

    if (detail.includes('invalid credentials') || detail.includes('incorrect')) {
      return 'Неверный логин или пароль.'
    }

    if (detail.includes('validation')) {
      return 'Ошибка валидации данных. Проверьте правильность заполнения всех полей.'
    }

    if (detail.includes('password')) {
      return 'Ошибка с паролем. Проверьте требования к паролю.'
    }

    if (detail.includes('email')) {
      return 'Ошибка с email адресом. Проверьте правильность email.'
    }

    // If detail is short and readable, return it
    if (detail.length < 100 && !detail.includes('{') && !detail.includes('[')) {
      return detail
    }
  }

  // Fallback
  return 'Произошла ошибка. Пожалуйста, попробуйте еще раз.'
}

/**
 * Converts S3 URL to proxied URL to avoid CORS issues
 * S3 storage doesn't have CORS configured, so we proxy through our backend
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // Check if URL is from S3 storage that needs proxying
  const s3Host = 's3.twcstorage.ru'

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.host === s3Host) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      return `${apiUrl}/api/v1/storage/proxy?url=${encodeURIComponent(url)}`
    }
  } catch {
    // If URL parsing fails, return original
    return url
  }

  // Return original URL if not from S3
  return url
}
