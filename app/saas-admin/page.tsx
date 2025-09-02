'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  Activity,
  TrendingUp,
  Shield,
  LogOut,
  RefreshCw,
  Database,
  AlertCircle,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react'

export default function SaasAdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalOrgs: 0,
    totalUsers: 0,
    totalLeads: 0,
    isAuthorized: false,
    authError: null
  })
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndFetchData()
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      // Get current user - DO NOT REDIRECT IF NOT LOGGED IN
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        setStats({
          ...stats,
          authError: 'Not logged in. Please login first.',
          isAuthorized: false
        })
        setLoading(false)
        return
      }

      setUser(user)

      // Check authorization by email ONLY
      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      const isAuthorizedByEmail = authorizedEmails.includes(user.email?.toLowerCase() || '')

      if (!isAuthorizedByEmail) {
        setStats({
          ...stats,
          authError: `Email ${user.email} is not authorized for admin access.`,
          isAuthorized: false
        })
        setLoading(false)
        return
      }

      // User is authorized - fetch stats
      try {
        const [orgsResult, usersResult, leadsResult] = await Promise.all([
          supabase.from('organizations').select('id, name, created_at'),
          supabase.from('users').select('id'),
          supabase.from('leads').select('id')
        ])

        setStats({
          totalOrgs: orgsResult.data?.length || 0,
          totalUsers: usersResult.data?.length || 0,
          totalLeads: leadsResult.data?.length || 0,
          isAuthorized: true,
          recentOrgs: orgsResult.data?.slice(0, 5) || [],
          authError: null
        })
      } catch (fetchError: any) {
        console.error('Error fetching stats:', fetchError)
        setStats({
          ...stats,
          isAuthorized: true,
          authError: null,
          fetchError: fetchError.message
        })
      }
    } catch (error: any) {
      console.error('Error in admin dashboard:', error)
      setStats({
        ...stats,
        authError: error.message,
        isAuthorized: false
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLogin = () => {
    // Store intended destination
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', '/saas-admin')
    }
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading SaaS admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg max-w-md">
          <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Login Required</h1>
          <p className="text-gray-400 mb-6">Please login with an authorized admin account.</p>
          <p className="text-sm text-gray-500 mb-6">Authorized: sam@atlas-gyms.co.uk</p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Not authorized
  if (!stats.isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">{stats.authError}</p>
          <p className="text-sm text-gray-500 mb-6">
            Current user: {user?.email}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout and Try Different Account
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Go to Regular Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Authorized - show dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">SaaS Admin Dashboard</h1>
            <p className="text-sm text-gray-400">Platform administration (Standalone)</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Gym Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalOrgs}</div>
            <div className="text-sm text-gray-400">Total Organizations</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalUsers}</div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalLeads}</div>
            <div className="text-sm text-gray-400">Total Leads</div>
          </div>
        </div>

        {/* Recent Organizations */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Recent Organizations
          </h2>
          {stats.recentOrgs && stats.recentOrgs.length > 0 ? (
            <div className="space-y-2">
              {stats.recentOrgs.map((org: any) => (
                <div key={org.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {org.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No organizations found</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => router.push('/saas-admin/weekly-brief')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <FileText className="h-4 w-4" />
              Weekly Brief
            </button>
            <button
              onClick={() => router.push('/saas-admin/tenants')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Building2 className="h-4 w-4" />
              Manage Tenants
            </button>
            <button
              onClick={() => router.push('/saas-admin/plans')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Settings className="h-4 w-4" />
              Manage Plans
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Stats
            </button>
            <button
              onClick={() => router.push('/admin-debug')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <Database className="h-4 w-4" />
              Debug Info
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            ℹ️ This is a standalone admin dashboard that bypasses middleware checks. 
            It uses email-based authorization only.
          </p>
        </div>
      </div>
    </div>
  )
}