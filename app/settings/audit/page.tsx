'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Activity, Filter, Download, Calendar, User, Shield, Settings, CreditCard, MessageSquare, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface AuditLog {
  id: string
  action: string
  resource: string
  resource_id?: string
  user_id: string
  user_email: string
  ip_address: string
  details: any
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateRange: '7days',
    action: 'all',
    user: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // In a real app, you'd fetch audit logs from the database
      // For now, we'll simulate some data
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          action: 'settings.update',
          resource: 'Business Profile',
          user_id: user.id,
          user_email: user.email || 'user@example.com',
          ip_address: '192.168.1.1',
          details: { field: 'business_name', old_value: 'Old Gym', new_value: 'Atlas Fitness' },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          action: 'staff.invite',
          resource: 'Staff',
          resource_id: 'staff123',
          user_id: user.id,
          user_email: user.email || 'user@example.com',
          ip_address: '192.168.1.1',
          details: { email: 'trainer@gym.com', role: 'staff' },
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          action: 'payment.received',
          resource: 'Payment',
          resource_id: 'pay_123',
          user_id: 'system',
          user_email: 'system',
          ip_address: 'system',
          details: { amount: 9900, currency: 'gbp', customer: 'John Doe' },
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: '4',
          action: 'integration.connected',
          resource: 'WhatsApp',
          user_id: user.id,
          user_email: user.email || 'user@example.com',
          ip_address: '192.168.1.1',
          details: { provider: 'Twilio', number: '+14155238886' },
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '5',
          action: 'security.password_changed',
          resource: 'Account',
          user_id: user.id,
          user_email: user.email || 'user@example.com',
          ip_address: '192.168.1.2',
          details: { method: 'web' },
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ]

      setLogs(mockLogs)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.startsWith('settings')) return <Settings className="h-4 w-4" />
    if (action.startsWith('staff')) return <User className="h-4 w-4" />
    if (action.startsWith('payment')) return <CreditCard className="h-4 w-4" />
    if (action.startsWith('integration')) return <MessageSquare className="h-4 w-4" />
    if (action.startsWith('security')) return <Shield className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-400'
    if (action.includes('create') || action.includes('add')) return 'text-green-400'
    if (action.includes('update') || action.includes('change')) return 'text-blue-400'
    return 'text-gray-400'
  }

  const formatAction = (action: string) => {
    return action.split('.').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) return null
    
    if (details.old_value && details.new_value) {
      return `Changed ${details.field} from "${details.old_value}" to "${details.new_value}"`
    }
    
    if (details.amount) {
      return `£${(details.amount / 100).toFixed(2)} from ${details.customer}`
    }
    
    if (details.email) {
      return `Invited ${details.email} as ${details.role}`
    }
    
    return JSON.stringify(details)
  }

  const handleExportLogs = async () => {
    // In a real app, this would export the logs
    alert('Audit logs export would be triggered here')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Audit Logs"
        description="Track all changes and activities in your organization"
        icon={<Activity className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={handleExportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Filter Logs</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">All Actions</option>
                <option value="settings">Settings Changes</option>
                <option value="staff">Staff Management</option>
                <option value="payment">Payments</option>
                <option value="integration">Integrations</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                User
              </label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">All Users</option>
                <option value="me">My Actions</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatBritishDateTime(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={getActionColor(log.action)}>
                        {getActionIcon(log.action)}
                      </span>
                      <span className={`text-sm ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.resource}
                    {log.resource_id && (
                      <span className="text-gray-500 text-xs ml-1">
                        ({log.resource_id})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.user_email === 'system' ? (
                      <span className="text-gray-500">System</span>
                    ) : (
                      log.user_email
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDetails(log.details)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No audit logs found for the selected filters
          </div>
        )}
      </div>

      {/* Retention Notice */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          <Calendar className="h-4 w-4 inline mr-2" />
          Audit Log Retention
        </h4>
        <p className="text-xs text-gray-500">
          Audit logs are retained for 90 days on the Professional plan. 
          Upgrade to Enterprise for unlimited retention and advanced filtering options.
        </p>
      </div>
    </div>
  )
}