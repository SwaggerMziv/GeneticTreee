'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'

/**
 * Returns the appropriate link for CTA buttons:
 * - `/dashboard` if user is authenticated
 * - `/auth` otherwise
 */
export function useAuthLink(): string {
  // Синхронная инициализация по наличию токена, чтобы не мигать ссылкой /auth
  const [link, setLink] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('access_token')) {
      return '/dashboard'
    }
    return '/auth'
  })

  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLink('/auth')
        return
      }
      try {
        await authApi.meSub()
        setLink('/dashboard')
      } catch {
        setLink('/auth')
      }
    }
    check()
  }, [])

  return link
}
