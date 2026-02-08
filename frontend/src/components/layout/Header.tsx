'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TreePine, LayoutDashboard, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function Header() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

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

        await authApi.meSub()
        setIsAuthenticated(true)
      } catch (error) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleNavClick = () => {
    setSheetOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange-dark flex items-center justify-center transition-transform group-hover:scale-105">
            <TreePine className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-2xl font-bold">
            <span className="text-foreground">Genetic</span>
            <span className="gradient-text">Tree</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-base font-medium transition-colors hover:text-orange',
                pathname === link.href ? 'text-orange' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Button + Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {!loading && (
            isAuthenticated ? (
              <Button asChild size="lg" className="font-medium shadow-glow-orange hover:shadow-glow-orange transition-shadow">
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4" />
                  Дашборд
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="font-medium shadow-glow-orange hover:shadow-glow-orange transition-shadow">
                <Link href="/auth">
                  Войти
                </Link>
              </Button>
            )
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">Меню</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-8">
                {/* Mobile Navigation Links */}
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleNavClick}
                      className={cn(
                        'text-base font-medium transition-colors hover:text-orange py-2',
                        pathname === link.href ? 'text-orange' : 'text-muted-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth Button */}
                {!loading && (
                  <div className="pt-4 border-t border-border">
                    {isAuthenticated ? (
                      <Button asChild size="lg" className="w-full font-medium shadow-glow-orange">
                        <Link href="/dashboard" onClick={handleNavClick}>
                          <LayoutDashboard className="w-4 h-4" />
                          Дашборд
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="lg" className="w-full font-medium shadow-glow-orange">
                        <Link href="/auth" onClick={handleNavClick}>
                          Войти
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
