'use client'

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { statisticsApi } from '@/lib/api/family'
import { User, FamilyStatistics, ApiError } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'

interface UserContextType {
  user: User | null
  stats: FamilyStatistics | null
  loading: boolean
  refreshStats: () => Promise<void>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

const defaultStats: FamilyStatistics = {
  total_relatives: 0,
  total_relationships: 0,
  alive_relatives: 0,
  deceased_relatives: 0,
  activated_relatives: 0,
  gender_distribution: { male: 0, female: 0, other: 0 },
  relationship_types_count: 0,
  generations_count: 0,
  relationship_types: [],
  total_stories: 0,
}

export default function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<FamilyStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  const refreshStats = async () => {
    if (!user) return
    try {
      const data = await statisticsApi.getStatistics(user.id)
      setStats(data)
    } catch {
      setStats(defaultStats)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
      toast.success('Вы успешно вышли из системы')
    } catch {
      // clear tokens anyway
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    router.push('/')
  }

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const fetchData = async () => {
      try {
        const userData = await authApi.me()
        setUser(userData)

        try {
          const statsData = await statisticsApi.getStatistics(userData.id)
          setStats(statsData)
        } catch {
          setStats(defaultStats)
        }
      } catch (error) {
        const apiError = error as ApiError
        if (apiError.status === 401) {
          router.push('/auth')
        } else {
          toast.error(getErrorMessage(apiError))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  return (
    <UserContext.Provider value={{ user, stats, loading, refreshStats, logout }}>
      {children}
    </UserContext.Provider>
  )
}
