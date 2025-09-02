import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/app/lib/admin/impersonation'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'
import AdminImpersonationBanner from './components/AdminImpersonationBanner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAdmin, adminUser, error } = await requireAdminAccess()

  if (!isAdmin) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <AdminImpersonationBanner />
      </Suspense>
      
      <AdminHeader adminUser={adminUser} />
      
      <div className="flex">
        <AdminSidebar role={adminUser.role} />
        
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}