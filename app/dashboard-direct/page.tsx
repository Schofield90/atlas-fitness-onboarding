'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../components/DashboardLayout'
import { createClient } from '@/app/lib/supabase/client'

export default function DirectDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Set the organization ID in localStorage for the session
    localStorage.setItem('organizationId', '63589490-8f55-4157-bd3a-e141594b748e')
    
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      }
    })
  }, [])

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-400">You're now logged in locally. Organization has been set.</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/leads" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <h3 className="text-lg font-semibold mb-2">Leads</h3>
            <p className="text-gray-400">View and manage your leads</p>
          </a>
          
          <a href="/memberships" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <h3 className="text-lg font-semibold mb-2">Memberships</h3>
            <p className="text-gray-400">Manage membership plans</p>
          </a>
          
          <a href="/customers" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700">
            <h3 className="text-lg font-semibold mb-2">Customers</h3>
            <p className="text-gray-400">View customer profiles</p>
          </a>
        </div>
      </div>
    </DashboardLayout>
  )
}