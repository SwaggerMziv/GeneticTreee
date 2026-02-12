'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'

/**
 * Returns the appropriate link for CTA buttons:
 * - `/dashboard` if user is authenticated
 * - `/auth` otherwise
 */
export function useAuthLink(): string {
  const [link, setLink] = useState('/auth')

  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return
        await authApi.meSub()
        setLink('/dashboard')
      } catch {
        // not authenticated
      }
    }
    check()
  }, [])

  return link
}
