'use client'

import { User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useUser } from '@/components/providers/UserProvider'

export default function DashboardHeader() {
  const { user, logout } = useUser()

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
      <SidebarTrigger className="-ml-1 h-9 w-9" />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex-1" />

      <ThemeToggle />

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{user?.username}</span>
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout}>
        <LogOut className="w-4 h-4" />
        <span className="sr-only">Выйти</span>
      </Button>
    </header>
  )
}
