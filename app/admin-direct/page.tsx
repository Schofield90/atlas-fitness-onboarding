'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  TrendingUp,
  Activity,
  Server,
  Cpu,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function AdminDirectPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalLeads: 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      console.log('Auth check - user:', user?.email, 'id:', user?.id)
      console.log('Auth error:', userError)
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      
      // Check if user is in super_admin_users table
      const { data: adminUser, error } = await supabase
        .from('super_admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      console.log('Admin check - data:', adminUser)
      console.log('Admin check - error:', error)
      console.log('Query attempted with user_id:', user.id)
      
      if (error || !adminUser) {
        console.log('Not an admin user - error:', error?.message)
        setIsAdmin(false)
      } else {
        console.log('Admin access granted:', adminUser)
        setIsAdmin(true)
        fetchStats()
      }
    } catch (error) {
      console.error('Error checking access:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, subscription_status')
      
      const { data: users } = await supabase
        .from('users')
        .select('id')
      
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
      
      setStats({
        totalOrgs: orgs?.length || 0,
        activeOrgs: orgs?.filter(o => o.subscription_status === 'active').length || 0,
        totalUsers: users?.length || 0,
        totalLeads: leads?.length || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">
            You don't have admin access. Your email ({user?.email}) is not authorized.
          </p>
          <button
            onClick={() => router.push('/dashboard-direct')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Admin Direct Access</h1>
            <p className="text-sm text-gray-400">Platform administration (simplified)</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              onClick={() => router.push('/dashboard-direct')}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Organizations"
            value={stats.totalOrgs}
            icon={<Building2 className="w-6 h-6" />}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            title="Active Organizations"
            value={stats.activeOrgs}
            icon={<Activity className="w-6 h-6" />}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users className="w-6 h-6" />}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={<TrendingUp className="w-6 h-6" />}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              System Status
            </h2>
            <div className="space-y-3">
              <StatusItem label="Database" status="healthy" />
              <StatusItem label="API" status="healthy" />
              <StatusItem label="Auth Service" status="healthy" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/organizations')}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Manage Organizations
              </button>
              <button
                onClick={() => router.push('/admin/billing')}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
              >
                Billing & Subscriptions
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Admin Info</h2>
            <div className="space-y-2 text-sm">
              <div>User ID: {user?.id}</div>
              <div>Email: {user?.email}</div>
              <div>Role: Platform Owner</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  )
}

function StatusItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {status === 'healthy' ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
        <span className="text-xs text-green-500">{status}</span>
      </div>
    </div>
  )
}