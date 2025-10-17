'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Mail,
  MessageSquare,
  RefreshCw,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Webhook,
  XCircle,
  Zap,
  Calendar,
  CreditCard,
  LogOut
} from 'lucide-react'

interface IntegrationStatus {
  id: string
  name: string
  type: 'oauth' | 'api_key' | 'webhook' | 'smtp'
  status: 'healthy' | 'degraded' | 'error' | 'disconnected'
  lastCheck: Date
  errorCount: number
  successRate: number
  apiQuota: {
    used: number
    limit: number
    resetTime: Date
  }
  rateLimit: {
    current: number
    limit: number
    window: string
  }
  tokenInfo?: {
    expiresAt: Date
    refreshable: boolean
    lastRefresh: Date
  }
  webhookStats?: {
    delivered: number
    failed: number
    pending: number
    lastDelivery: Date
  }
  tenantCount: number
  icon: React.ReactNode
  color: string
}

interface TenantIntegrationError {
  id: string
  tenantId: string
  tenantName: string
  integration: string
  error: string
  timestamp: Date
  resolved: boolean
}

export default function IntegrationsMonitoringDashboard() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [errors, setErrors] = useState<TenantIntegrationError[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndFetchData()
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
        router.push('/saas-admin')
        return
      }

      setUser(user)
      await fetchMonitoringData()
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  const fetchMonitoringData = async () => {
    try {
      // Simulate API calls to get integration status
      // In production, these would be real API endpoints
      const mockIntegrations: IntegrationStatus[] = [
        {
          id: 'google-calendar',
          name: 'Google Calendar',
          type: 'oauth',
          status: 'healthy',
          lastCheck: new Date(),
          errorCount: 2,
          successRate: 98.5,
          apiQuota: { used: 850, limit: 1000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 45, limit: 100, window: '1 hour' },
          tokenInfo: {
            expiresAt: new Date(Date.now() + 3600000),
            refreshable: true,
            lastRefresh: new Date(Date.now() - 1800000)
          },
          tenantCount: 34,
          icon: <Calendar className="w-6 h-6" />,
          color: 'blue'
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp/Twilio',
          type: 'api_key',
          status: 'degraded',
          lastCheck: new Date(),
          errorCount: 12,
          successRate: 92.3,
          apiQuota: { used: 2340, limit: 5000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 180, limit: 200, window: '1 minute' },
          tenantCount: 28,
          icon: <MessageSquare className="w-6 h-6" />,
          color: 'green'
        },
        {
          id: 'facebook',
          name: 'Facebook Ads',
          type: 'oauth',
          status: 'error',
          lastCheck: new Date(),
          errorCount: 45,
          successRate: 67.8,
          apiQuota: { used: 890, limit: 1000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 95, limit: 200, window: '1 hour' },
          tokenInfo: {
            expiresAt: new Date(Date.now() - 3600000), // Expired
            refreshable: true,
            lastRefresh: new Date(Date.now() - 86400000)
          },
          tenantCount: 19,
          icon: <Users className="w-6 h-6" />,
          color: 'blue'
        },
        {
          id: 'email-smtp',
          name: 'Email (SMTP)',
          type: 'smtp',
          status: 'healthy',
          lastCheck: new Date(),
          errorCount: 1,
          successRate: 99.8,
          apiQuota: { used: 450, limit: 1000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 25, limit: 100, window: '1 hour' },
          tenantCount: 42,
          icon: <Mail className="w-6 h-6" />,
          color: 'purple'
        },
        {
          id: 'webhooks',
          name: 'Webhooks',
          type: 'webhook',
          status: 'degraded',
          lastCheck: new Date(),
          errorCount: 8,
          successRate: 94.2,
          apiQuota: { used: 1200, limit: 2000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 150, limit: 500, window: '1 minute' },
          webhookStats: {
            delivered: 1847,
            failed: 113,
            pending: 12,
            lastDelivery: new Date(Date.now() - 300000)
          },
          tenantCount: 38,
          icon: <Webhook className="w-6 h-6" />,
          color: 'orange'
        },
        {
          id: 'stripe',
          name: 'Stripe',
          type: 'api_key',
          status: 'healthy',
          lastCheck: new Date(),
          errorCount: 0,
          successRate: 100,
          apiQuota: { used: 234, limit: 1000, resetTime: new Date(Date.now() + 86400000) },
          rateLimit: { current: 15, limit: 100, window: '1 second' },
          tenantCount: 31,
          icon: <CreditCard className="w-6 h-6" />,
          color: 'indigo'
        }
      ]

      // Mock error logs
      const mockErrors: TenantIntegrationError[] = [
        {
          id: '1',
          tenantId: 'org_123',
          tenantName: 'Atlas Fitness Downtown',
          integration: 'Facebook Ads',
          error: 'Token expired - refresh required',
          timestamp: new Date(Date.now() - 300000),
          resolved: false
        },
        {
          id: '2', 
          tenantId: 'org_456',
          tenantName: 'PowerGym Elite',
          integration: 'WhatsApp',
          error: 'Rate limit exceeded',
          timestamp: new Date(Date.now() - 600000),
          resolved: false
        },
        {
          id: '3',
          tenantId: 'org_789',
          tenantName: 'FitLife Studio',
          integration: 'Webhooks',
          error: 'Delivery failed - endpoint timeout',
          timestamp: new Date(Date.now() - 900000),
          resolved: true
        }
      ]

      setIntegrations(mockIntegrations)
      setErrors(mockErrors)
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchMonitoringData()
  }

  const performHealthCheck = async (integrationId: string) => {
    // Simulate health check API call
    console.log(`Performing health check for ${integrationId}`)
    // In production: await fetch(`/api/saas-admin/integrations/${integrationId}/health-check`)
  }

  const refreshTokens = async (integrationType?: string) => {
    // Simulate token refresh API call
    console.log(`Refreshing tokens for ${integrationType || 'all integrations'}`)
    // In production: await fetch('/api/saas-admin/integrations/refresh-tokens', { method: 'POST' })
  }

  const retryFailedWebhooks = async () => {
    // Simulate webhook retry API call
    console.log('Retrying failed webhooks')
    // In production: await fetch('/api/saas-admin/webhooks/retry-failed', { method: 'POST' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'degraded': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'disconnected': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />
      case 'disconnected': return <XCircle className="w-5 h-5 text-gray-400" />
      default: return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading integrations dashboard...</p>
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
            <h1 className="text-2xl font-bold text-purple-500">Integrations Monitoring</h1>
            <p className="text-sm text-gray-400">Real-time monitoring and health checks for all platform integrations</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/saas-admin')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Back to Admin
            </button>
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'errors', name: 'Error Logs', icon: AlertCircle },
              { id: 'tokens', name: 'Token Status', icon: Shield },
              { id: 'webhooks', name: 'Webhooks', icon: Webhook }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    selectedTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Integrations</p>
                    <p className="text-3xl font-bold">{integrations.length}</p>
                  </div>
                  <Database className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Healthy</p>
                    <p className="text-3xl font-bold text-green-400">
                      {integrations.filter(i => i.status === 'healthy').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Issues</p>
                    <p className="text-3xl font-bold text-red-400">
                      {integrations.filter(i => i.status === 'error' || i.status === 'degraded').length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Success Rate</p>
                    <p className="text-3xl font-bold">
                      {Math.round(integrations.reduce((sum, i) => sum + i.successRate, 0) / integrations.length)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Integration Status Grid */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Integration Status</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => refreshTokens()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
                  >
                    Refresh All Tokens
                  </button>
                  <button
                    onClick={() => retryFailedWebhooks()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    Retry Failed Webhooks
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-${integration.color}-500/10`}>
                          {integration.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{integration.name}</h3>
                          <p className="text-sm text-gray-400">{integration.tenantCount} tenants connected</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusIcon(integration.status)}
                        <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                          {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                        </span>
                        <button
                          onClick={() => performHealthCheck(integration.id)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                        >
                          Health Check
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Success Rate</p>
                        <p className="font-semibold">{integration.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Errors (24h)</p>
                        <p className="font-semibold text-red-400">{integration.errorCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">API Quota</p>
                        <p className="font-semibold">
                          {integration.apiQuota.used}/{integration.apiQuota.limit}
                        </p>
                        <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(integration.apiQuota.used / integration.apiQuota.limit) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400">Rate Limit</p>
                        <p className="font-semibold">
                          {integration.rateLimit.current}/{integration.rateLimit.limit} per {integration.rateLimit.window}
                        </p>
                      </div>
                    </div>

                    {integration.tokenInfo && (
                      <div className="mt-4 p-3 bg-gray-600 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">OAuth Token:</span>
                          <span className={integration.tokenInfo.expiresAt > new Date() ? 'text-green-400' : 'text-red-400'}>
                            {integration.tokenInfo.expiresAt > new Date() ? 'Valid' : 'Expired'}
                          </span>
                          {integration.tokenInfo.expiresAt <= new Date() && (
                            <button
                              onClick={() => refreshTokens(integration.type)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                            >
                              Refresh
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {integration.webhookStats && (
                      <div className="mt-4 p-3 bg-gray-600 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-300">Delivered</p>
                            <p className="font-semibold text-green-400">{integration.webhookStats.delivered}</p>
                          </div>
                          <div>
                            <p className="text-gray-300">Failed</p>
                            <p className="font-semibold text-red-400">{integration.webhookStats.failed}</p>
                          </div>
                          <div>
                            <p className="text-gray-300">Pending</p>
                            <p className="font-semibold text-yellow-400">{integration.webhookStats.pending}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Logs Tab */}
        {selectedTab === 'errors' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Integration Error Logs</h2>
              <div className="flex items-center gap-2">
                <select className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                  <option value="all">All Integrations</option>
                  <option value="facebook">Facebook Ads</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="webhooks">Webhooks</option>
                </select>
                <select className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {errors.map((error) => (
                <div key={error.id} className={`p-4 rounded-lg border-l-4 ${
                  error.resolved 
                    ? 'bg-gray-700 border-green-400' 
                    : 'bg-red-900/20 border-red-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{error.integration}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{error.tenantName}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">
                          {error.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{error.error}</p>
                      <p className="text-xs text-gray-500">Tenant ID: {error.tenantId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {error.resolved ? (
                        <span className="px-2 py-1 bg-green-600 text-green-100 rounded text-xs">
                          Resolved
                        </span>
                      ) : (
                        <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors">
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token Status Tab */}
        {selectedTab === 'tokens' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">OAuth Token Status</h2>
              <button
                onClick={() => refreshTokens()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
              >
                Refresh All Expiring Tokens
              </button>
            </div>

            <div className="space-y-4">
              {integrations.filter(i => i.tokenInfo).map((integration) => (
                <div key={integration.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-gray-400">{integration.tenantCount} tenants</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${
                          integration.tokenInfo!.expiresAt > new Date() 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {integration.tokenInfo!.expiresAt > new Date() ? 'Valid' : 'Expired'}
                        </span>
                        {integration.tokenInfo!.expiresAt <= new Date() && (
                          <button
                            onClick={() => refreshTokens(integration.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                          >
                            Refresh Now
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Expires: {integration.tokenInfo!.expiresAt.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Last refresh: {integration.tokenInfo!.lastRefresh.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {selectedTab === 'webhooks' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Webhook Monitoring</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => retryFailedWebhooks()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                >
                  Retry All Failed
                </button>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-colors">
                  Configure Endpoints
                </button>
              </div>
            </div>

            {/* Webhook Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Delivered</p>
                    <p className="text-2xl font-bold text-green-400">
                      {integrations.find(i => i.webhookStats)?.webhookStats?.delivered || 0}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Failed</p>
                    <p className="text-2xl font-bold text-red-400">
                      {integrations.find(i => i.webhookStats)?.webhookStats?.failed || 0}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Retry</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {integrations.find(i => i.webhookStats)?.webhookStats?.pending || 0}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Webhook Delivery Logs */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Recent Webhook Deliveries</h3>
              <div className="space-y-3">
                {[
                  { endpoint: 'lead-webhook', status: 'success', timestamp: new Date(), tenant: 'Atlas Fitness' },
                  { endpoint: 'booking-webhook', status: 'failed', timestamp: new Date(Date.now() - 300000), tenant: 'PowerGym' },
                  { endpoint: 'payment-webhook', status: 'success', timestamp: new Date(Date.now() - 600000), tenant: 'FitLife' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium">{log.endpoint}</p>
                        <p className="text-sm text-gray-400">{log.tenant}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{log.timestamp.toLocaleTimeString()}</p>
                      <p className={`text-xs ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {log.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}