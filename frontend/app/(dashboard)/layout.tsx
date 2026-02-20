'use client'

import { usePathname } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from '@/components/AppSidebar'
import ImportProgressModal from '@/components/ImportProgressModal'
import ImportProgressWidget from '@/components/ImportProgressWidget'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const pathname = usePathname()
  const isProjectDetailPage = pathname?.match(/^\/projects\/[^/]+$/)

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ImportProgressModal />
      {!isProjectDetailPage && <ImportProgressWidget />}
    </ProtectedRoute>
  )
}
