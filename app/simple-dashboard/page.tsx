'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'

export default function SimpleDashboard() {
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get organization
        const { data: orgData } = await supabase
          .from('organization_members')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .single()
        
        if (orgData) {
          setOrg(orgData.organizations)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Dumbbell className="h-8 w-8 text-orange-500 mr-3" />
              <h1 className="text-xl font-bold text-orange-500">GymLeadHub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to {org?.name || 'Your Organization'}
            </h2>
            <p className="text-gray-400">
              Organization ID: {org?.id}
            </p>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/leads" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Leads</h3>
              <p className="text-gray-400">Manage your leads and contacts</p>
            </Link>

            <Link href="/campaigns" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Campaigns</h3>
              <p className="text-gray-400">Create and manage campaigns</p>
            </Link>

            <Link href="/test-whatsapp" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">WhatsApp</h3>
              <p className="text-gray-400">Send test messages</p>
            </Link>

            <Link href="/ai-config" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">AI Config</h3>
              <p className="text-gray-400">Configure AI responses</p>
            </Link>

            <Link href="/forms" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Forms</h3>
              <p className="text-gray-400">Create lead capture forms</p>
            </Link>

            <Link href="/landing-pages" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Landing Pages</h3>
              <p className="text-gray-400">Build and manage landing pages</p>
            </Link>

            <Link href="/settings" className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
              <p className="text-gray-400">Manage your account</p>
            </Link>
          </div>

          {/* Debug Info */}
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">User ID:</span>
                <span className="text-white font-mono">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Organization:</span>
                <span className="text-white">{org?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Plan:</span>
                <span className="text-white">{org?.plan || 'starter'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}