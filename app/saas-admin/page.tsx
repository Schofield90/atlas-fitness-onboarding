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
import AdminKPITiles from './components/AdminKPITiles'
import AdminOrganizationsTable from './components/AdminOrganizationsTable'
import AdminActivityFeed from './components/AdminActivityFeed'
import AdminSystemHealth from './components/AdminSystemHealth'
import AdminSidebar from './components/AdminSidebar'

export default function SaasAdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalOrgs: 0,
    totalUsers: 0,
    totalLeads: 0,
    isAuthorized: false,
    authError: null
  })
  const [metrics, setMetrics] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SaaS Admin] Auth state changed:', event, session?.user?.email)

      if (mounted && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // Small delay to ensure session is fully loaded
        setTimeout(() => {
          if (mounted) {
            checkAuthAndFetchData()
          }
        }, 100)
      }
    })

    // Also check immediately in case session already exists
    checkAuthAndFetchData()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const checkAuthAndFetchData = async (retryCount = 0) => {
    try {
      // Get current user - with retry mechanism for session loading
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        // Retry up to 3 times with increasing delays (100ms, 300ms, 500ms)
        if (retryCount < 3) {
          const delay = 100 + (retryCount * 200)
          console.log(`[SaaS Admin] User not found, retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return checkAuthAndFetchData(retryCount + 1)
        }

        // All retries exhausted
        console.log('[SaaS Admin] User not found after 3 retries')
        setStats({
          ...stats,
          authError: 'Not logged in. Please login first.',
          isAuthorized: false
        })
        setLoading(false)
        return
      }

      console.log('[SaaS Admin] User found:', { userId: user.id, email: user.email })
      setUser(user)

      // Check authorization by email ONLY - allow @gymleadhub.co.uk or @atlas-gyms.co.uk
      const userEmail = user.email?.toLowerCase() || ''
      const isAuthorizedByEmail =
        userEmail === 'sam@gymleadhub.co.uk' ||
        userEmail.endsWith('@gymleadhub.co.uk') ||
        userEmail.endsWith('@atlas-gyms.co.uk')
      console.log('[SaaS Admin] Authorization check:', { email: user.email, isAuthorized: isAuthorizedByEmail })

      if (!isAuthorizedByEmail) {
        setStats({
          ...stats,
          authError: `Email ${user.email} is not authorized for admin access.`,
          isAuthorized: false
        })
        setLoading(false)
        return
      }

      // User is authorized - fetch stats and metrics
      try {
        const [orgsResult, usersResult, leadsResult, metricsResult] = await Promise.all([
          supabase.from('organizations').select('id, name, created_at'),
          supabase.from('users').select('id'),
          supabase.from('leads').select('id'),
          fetch('/api/saas-admin/metrics').then(r => r.json())
        ])

        setStats({
          totalOrgs: orgsResult.data?.length || 0,
          totalUsers: usersResult.data?.length || 0,
          totalLeads: leadsResult.data?.length || 0,
          isAuthorized: true,
          recentOrgs: orgsResult.data?.slice(0, 5) || [],
          authError: null
        })

        // Set financial metrics and activity feed
        if (metricsResult.success) {
          setMetrics(metricsResult.metrics)
          setRecentActivity(metricsResult.recentActivity)
        }
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
    // Redirect to dedicated admin signin page
    router.push('/signin?redirect=/saas-admin')
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
          <p className="text-sm text-gray-500 mb-6">Authorized: sam@gymleadhub.co.uk</p>
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
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Admin HQ</h1>
              <p className="text-sm text-gray-400">Platform overview and management console</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {user?.email}
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm text-white"
              >
                Gym Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Financial KPI Tiles */}
          <AdminKPITiles metrics={metrics} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organizations Table - 2 columns */}
            <div className="lg:col-span-2">
              <AdminOrganizationsTable />
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="space-y-6">
              {/* System Health */}
              <AdminSystemHealth />

              {/* Activity Feed */}
              <AdminActivityFeed activities={recentActivity} />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
            <p className="text-sm text-orange-300">
              ℹ️ SaaS platform admin dashboard - Authorized: {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}