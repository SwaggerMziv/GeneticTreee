'use client'

import { type ReactNode } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import UserProvider, { useUser } from '@/components/providers/UserProvider'
import PageLoader from '@/components/ui/PageLoader'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

function DashboardContent({ children }: { children: ReactNode }) {
  const { loading } = useUser()

  if (loading) {
    return <PageLoader />
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
      <OnboardingWizard />
    </SidebarProvider>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <DashboardContent>{children}</DashboardContent>
    </UserProvider>
  )
}
