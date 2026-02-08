import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

  // Handle structured error types from backend
  if (error.error_type) {
    const constraintMessages: Record<string, string> = {
      unique_email: 'Пользователь с таким email уже зарегистрирован.',
      unique_username: 'Пользователь с таким именем уже существует.',
      unique_telegram_id: 'Этот Telegram аккаунт уже привязан к другому пользователю.',
      unique_constraint: 'Такая запись уже существует.',
      foreign_key_violation: 'Невозможно выполнить операцию: связанные данные не найдены.',
    }

    const errorTypeMessages: Record<string, string> = {
      constraint_error: constraintMessages[error.constraint] || 'Конфликт данных.',
      integrity_error: 'Ошибка целостности данных. Проверьте введённые значения.',
      connection_error: 'Не удалось подключиться к базе данных. Попробуйте позже.',
      timeout_error: 'Превышено время ожидания. Попробуйте ещё раз.',
      data_error: 'Неверный формат данных. Проверьте заполнение полей.',
      not_found: 'Запрашиваемые данные не найдены.',
      already_exists: 'Такая запись уже существует.',
      user_not_found: 'Пользователь не найден.',
      user_already_exists: error.field === 'email'
        ? 'Пользователь с таким email уже зарегистрирован.'
        : error.field === 'username'
          ? 'Пользователь с таким именем уже существует.'
          : 'Такой пользователь уже существует.',
      user_inactive: 'Аккаунт деактивирован. Обратитесь в поддержку.',
      relative_not_found: 'Родственник не найден.',
      access_denied: 'У вас нет доступа к этому родственнику.',
      relationship_not_found: 'Связь не найдена.',
      relationship_already_exists: 'Такая связь уже существует.',
      self_reference: 'Нельзя создать связь человека с самим собой.',
      invalid_type: 'Неверный тип связи.',
      invalid_invitation_token: 'Недействительная или просроченная ссылка-приглашение.',
      relative_already_activated: 'Этот родственник уже активирован.',
      telegram_user_already_linked: 'Этот Telegram аккаунт уже привязан к другому родственнику.',
    }

    if (errorTypeMessages[error.error_type]) {
      return errorTypeMessages[error.error_type]
    }
  }

  // Handle specific HTTP status codes
  const statusMessages: Record<number, string> = {
    400: 'Неверные данные. Проверьте правильность введённой информации.',
    401: 'Неверные учётные данные. Проверьте логин и пароль.',
    403: 'Доступ запрещён.',
    404: 'Запрошенный ресурс не найден.',
    409: 'Конфликт данных. Возможно, такая запись уже существует.',
    422: 'Ошибка валидации. Проверьте правильность заполнения формы.',
    429: 'Слишком много запросов. Подождите немного.',
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

    if (detail.includes('already exists') || detail.includes('duplicate') || detail.includes('уже существует')) {
      return 'Такая запись уже существует.'
    }

    if (detail.includes('not found') || detail.includes('не найден')) {
      return 'Запрашиваемые данные не найдены.'
    }

    if (detail.includes('invalid credentials') || detail.includes('incorrect')) {
      return 'Неверный логин или пароль.'
    }

    // If detail is short and readable, return it
    if (detail.length < 100 && !detail.includes('{') && !detail.includes('[') && !detail.includes('class ')) {
      return detail
    }
  }

  // Fallback
  return 'Произошла ошибка. Попробуйте ещё раз.'
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
