'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, ArrowLeft } from 'lucide-react'
import AdminSidebar from '../components/AdminSidebar'

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      router.push('/signin?redirect=/saas-admin/users')
      return
    }
    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
      router.push('/saas-admin')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/saas-admin')} className="p-2 text-gray-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-orange-500">Users</h1>
                <p className="text-sm text-gray-400">Manage platform users</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{user?.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-sm text-white">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">Users management coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
