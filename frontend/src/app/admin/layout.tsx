'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Send,
  Shield,
  ArrowLeft,
  LogOut,
  User,
  GitBranch,
  Cpu,
  BookMarked,
} from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import PageLoader from '@/components/ui/PageLoader'
import { authApi } from '@/lib/api/auth'
import { User as UserType } from '@/types'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/relatives', label: 'Родственники', icon: GitBranch },
  { href: '/admin/stories', label: 'Истории', icon: BookOpen },
  { href: '/admin/ai', label: 'AI / Токены', icon: Cpu },
  { href: '/admin/books', label: 'Книги', icon: BookMarked },
  { href: '/admin/telegram', label: 'Telegram', icon: Send },
]

function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <Link href="/admin" className="flex items-center gap-3 group/logo group-data-[collapsible=icon]:justify-center">
          <div className="w-9 h-9 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center transition-transform group-hover/logo:scale-105 shrink-0">
            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl font-bold group-data-[collapsible=icon]:hidden">
            <span className="text-sidebar-foreground">Админ</span>
            <span className="text-red-500">Панель</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Управление</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive = item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="lg"
                      tooltip={item.label}
                    >
                      <Link href={item.href} className={cn(
                        !isActive && 'text-sidebar-foreground'
                      )}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-base">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg" tooltip="К дашборду">
                  <Link href="/dashboard" className="text-sidebar-foreground">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-base">К дашборду</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          Админ-панель v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function AdminHeader({ user }: { user: UserType }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // clear anyway
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    router.push('/')
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
      <SidebarTrigger className="-ml-1 h-9 w-9" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex-1" />
      <ThemeToggle />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{user.username}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout}>
        <LogOut className="w-4 h-4" />
        <span className="sr-only">Выйти</span>
      </Button>
    </header>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const userData = await authApi.me()
        if (!userData.is_superuser) {
          router.push('/dashboard')
          return
        }
        setUser(userData)
      } catch {
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [router])

  if (loading || !user) {
    return <PageLoader />
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader user={user} />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
