'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TreePine,
  LayoutDashboard,
  Sparkles,
  BookOpen,
  FileText,
  BookMarked,
  HelpCircle,
  Send,
} from 'lucide-react'
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
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { href: '/tree', label: 'Семейное древо', icon: TreePine },
  { href: '/dashboard/ai-assistant', label: 'ИИ Ассистент', icon: Sparkles },
  { href: '/dashboard/stories', label: 'Истории', icon: BookOpen },
  { href: '/dashboard/book', label: 'Книга', icon: FileText },
  { href: '/dashboard/telegram', label: 'Telegram', icon: Send },
]

const helpItems = [
  { href: '/dashboard/guide', label: 'Руководство', icon: BookMarked },
  { href: '/dashboard/faq', label: 'FAQ', icon: HelpCircle },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <Link href="/" className="flex items-center gap-3 group/logo group-data-[collapsible=icon]:justify-center">
          <div className="w-9 h-9 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 rounded-xl bg-gradient-to-br from-azure to-azure-dark flex items-center justify-center transition-transform group-hover/logo:scale-105 shrink-0">
            <TreePine className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl font-bold group-data-[collapsible=icon]:hidden">
            <span className="text-sidebar-foreground">Genetic</span>
            <span className="gradient-text">Tree</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
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
          <SidebarGroupLabel>Помощь</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => {
                const isActive = pathname.startsWith(item.href)

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
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          GeneticTree v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
