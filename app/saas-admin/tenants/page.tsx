'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Shield,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  status: 'trial' | 'active' | 'suspended' | 'churned'
  health_score?: number
  risk_score?: number
  mrr_cents?: number
  created_at: string
  subscription_status?: string
  last_activity_at?: string
  user_count?: number
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    churned: 0,
    totalMrr: 0,
    avgHealth: 0
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndFetchData()
  }, [statusFilter, sortBy])

  const checkAuthAndFetchData = async () => {
    try {
      // Check admin auth
      const { data: { user } } = await supabase.auth.getUser()
      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      
      if (!user || !authorizedEmails.includes(user.email?.toLowerCase() || '')) {
        router.push('/saas-admin')
        return
      }

      // Fetch organizations with enhanced data
      let query = supabase
        .from('organizations')
        .select(`
          *,
          users!inner(id)
        `)

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply sorting
      if (sortBy === 'health') {
        query = query.order('health_score', { ascending: false })
      } else if (sortBy === 'mrr') {
        query = query.order('mrr_cents', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data: orgs, error } = await query

      if (error) {
        console.error('Error fetching tenants:', error)
        return
      }

      // Process and enrich tenant data
      const enrichedTenants = (orgs || []).map(org => ({
        ...org,
        status: org.status || 'active',
        health_score: org.health_score || Math.floor(Math.random() * 100), // Mock data
        risk_score: org.risk_score || Math.floor(Math.random() * 100),
        mrr_cents: org.mrr_cents || Math.floor(Math.random() * 10000),
        user_count: Math.floor(Math.random() * 50) + 1 // Mock data
      }))

      setTenants(enrichedTenants)

      // Calculate stats
      const statsData = {
        total: enrichedTenants.length,
        active: enrichedTenants.filter(t => t.status === 'active').length,
        trial: enrichedTenants.filter(t => t.status === 'trial').length,
        suspended: enrichedTenants.filter(t => t.status === 'suspended').length,
        churned: enrichedTenants.filter(t => t.status === 'churned').length,
        totalMrr: enrichedTenants.reduce((sum, t) => sum + (t.mrr_cents || 0), 0) / 100,
        avgHealth: Math.round(enrichedTenants.reduce((sum, t) => sum + (t.health_score || 0), 0) / enrichedTenants.length)
      }

      setStats(statsData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
      trial: { icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
      suspended: { icon: Ban, color: 'text-yellow-500 bg-yellow-500/10' },
      churned: { icon: XCircle, color: 'text-red-500 bg-red-500/10' }
    }
    
    const badge = badges[status as keyof typeof badges] || badges.active
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    )
  }

  const getHealthIndicator = (score: number) => {
    let color = 'text-green-500'
    let Icon = TrendingUp
    
    if (score < 40) {
      color = 'text-red-500'
      Icon = TrendingDown
    } else if (score < 70) {
      color = 'text-yellow-500'
      Icon = TrendingUp
    }
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{score}</span>
      </div>
    )
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/saas-admin')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold">Tenant Directory</h1>
              <p className="text-sm text-gray-400">Manage all organizations</p>
            </div>
          </div>
          <button
            onClick={checkAuthAndFetchData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Tenants</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            <div className="text-xs text-gray-400">Active</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.trial}</div>
            <div className="text-xs text-gray-400">Trial</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.suspended}</div>
            <div className="text-xs text-gray-400">Suspended</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-500">{stats.churned}</div>
            <div className="text-xs text-gray-400">Churned</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">£{stats.totalMrr.toFixed(0)}</div>
            <div className="text-xs text-gray-400">Total MRR</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.avgHealth}</div>
            <div className="text-xs text-gray-400">Avg Health</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="churned">Churned</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="created_at">Newest First</option>
            <option value="health">Health Score</option>
            <option value="mrr">MRR</option>
          </select>
        </div>

        {/* Tenants Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MRR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-700/50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-gray-400">{tenant.id.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(tenant.status)}
                  </td>
                  <td className="px-4 py-3">
                    {getHealthIndicator(tenant.health_score || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">£{((tenant.mrr_cents || 0) / 100).toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span>{tenant.user_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/saas-admin/tenants/${tenant.id}`)}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-600 rounded"
                        title="Impersonate"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-600 rounded"
                        title="More Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}