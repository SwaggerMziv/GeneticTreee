'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from 'antd'
import { TreePine, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api/auth'

export default function Header() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  const navLinks = [
    { href: '/', label: 'Главная' },
    { href: '/about', label: 'О проекте' },
  ]

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Check if user is authenticated using /api/v1/auth/me/sub
        await authApi.meSub()
        setIsAuthenticated(true)
      } catch (error) {
        // Silently handle auth check failure
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-charcoal-700">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center transition-transform group-hover:scale-105">
            <TreePine className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-2xl font-bold">
            <span className="text-white">Genetic</span>
            <span className="gradient-text">Tree</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-base font-medium transition-colors hover:text-orange',
                pathname === link.href ? 'text-orange' : 'text-gray-300'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Button */}
        <div>
          {!loading && (
            isAuthenticated ? (
              <Link href="/dashboard">
                <Button
                  type="primary"
                  size="large"
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  className="font-medium shadow-glow-orange hover:shadow-glow-orange transition-shadow"
                >
                  Дашборд
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button
                  type="primary"
                  size="large"
                  className="font-medium shadow-glow-orange hover:shadow-glow-orange transition-shadow"
                >
                  Войти
                </Button>
              </Link>
            )
          )}
        </div>
      </nav>
    </header>
  )
}
