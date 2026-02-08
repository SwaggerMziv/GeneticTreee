'use client'

import { type ReactNode } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import UserProvider, { useUser } from '@/components/providers/UserProvider'
import PageLoader from '@/components/ui/PageLoader'

function TreeContent({ children }: { children: ReactNode }) {
  const { loading } = useUser()

  if (loading) {
    return <PageLoader />
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function TreeLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <TreeContent>{children}</TreeContent>
    </UserProvider>
  )
}
