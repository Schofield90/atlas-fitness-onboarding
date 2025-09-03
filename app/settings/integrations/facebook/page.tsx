'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Facebook, CheckCircle, XCircle, RefreshCw, Plus, Trash2, ExternalLink, AlertCircle, Zap, Check } from 'lucide-react'
import { useToast } from '@/app/lib/hooks/useToast'

interface FacebookConnection {
  id: string
  facebook_user_id: string
  facebook_user_name?: string
  facebook_user_email?: string
  is_active: boolean
  created_at: string
  pages?: FacebookPage[]
}

interface FacebookPage {
  id: string
  facebook_page_id: string
  page_name: string
  access_token: string
  is_active: boolean
  is_primary: boolean
}

interface LeadForm {
  id: string
  name: string
  status: string
  leads_count: number
  last_sync?: string
  selected?: boolean
}

export default function FacebookIntegrationPage() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connection, setConnection] = useState<FacebookConnection | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [leadForms, setLeadForms] = useState<LeadForm[]>([])
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set())
  const [savingPage, setSavingPage] = useState(false)
  const [savingForms, setSavingForms] = useState(false)
  const [loadingForms, setLoadingForms] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalLeads: 0,
    syncedToday: 0,
    activeForms: 0,
    lastSync: null as string | null
  })
  
  const supabase = createClient()
  const toast = useToast()
  
  // Derived state - check if Facebook is connected
  const isConnected = !!connection && connection.is_active

  useEffect(() => {
    // Check if just connected from callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('just_connected') === 'true') {
      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname)
      toast.success('Facebook connected successfully!')
      // Force refresh connection status
      setTimeout(() => {
        fetchConnectionStatus()
      }, 500)
    } else if (params.get('error')) {
      // Handle OAuth error
      const error = params.get('error')
      const errorDescription = params.get('error_description') || 'Failed to connect to Facebook'
      window.history.replaceState({}, document.title, window.location.pathname)
      toast.error(errorDescription)
      fetchConnectionStatus()
    } else {
      fetchConnectionStatus()
    }
  }, [toast])

  const fetchConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('No authenticated user found')
        setLoading(false)
        return
      }

      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgError || !orgData) {
        console.warn('No organization found for user:', orgError)
        setLoading(false)
        return
      }
      
      // Store the organization ID for later use
      setOrganizationId(orgData.organization_id)

      // Check for Facebook connection - handle both single result and no result gracefully
      const { data: fbConnection, error: fbError } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .maybeSingle()  // Use maybeSingle() instead of single() to handle no results gracefully

      if (fbError) {
        console.error('Error fetching Facebook connection:', fbError)
        // Don't throw, just continue without connection data
      } else if (fbConnection) {
        // Fetch associated pages
        const { data: pages } = await supabase
          .from('facebook_pages')
          .select('*')
          .eq('integration_id', fbConnection.id)
          .eq('is_active', true)
        
        const connectionWithPages = {
          ...fbConnection,
          pages: pages || []
        }
        
        setConnection(connectionWithPages)
        
        // Set selected page - prefer primary, otherwise first page
        const primaryPage = pages?.find(p => p.is_primary)
        const pageToSelect = primaryPage || pages?.[0]
        
        if (pageToSelect) {
          setSelectedPageId(pageToSelect.facebook_page_id)
          // Fetch lead forms for selected page
          try {
            await fetchLeadForms(pageToSelect.facebook_page_id, orgData.organization_id)
          } catch (error) {
            console.error('Failed to fetch lead forms:', error)
          }
        }
        
        try {
          await fetchStats(orgData.organization_id)
        } catch (error) {
          console.error('Failed to fetch stats:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching connection status:', error)
      // Still set loading to false but don't crash the page
      toast.error('Failed to load Facebook connection status. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadForms = async (pageId: string, organizationId: string) => {
    setLoadingForms(true)
    try {
      // Fetch lead forms from Meta API with the required pageId parameter
      const response = await fetch(`/api/integrations/facebook/lead-forms?pageId=${pageId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeadForms(data.forms || [])
      } else {
        console.error('Failed to fetch lead forms:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching lead forms:', error)
    } finally {
      setLoadingForms(false)
    }
  }

  const fetchStats = async (organizationId: string) => {
    try {
      // Get lead statistics
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('source', 'facebook')

      if (!error && leads) {
        const today = new Date().toDateString()
        const todayLeads = leads.filter(l => 
          new Date(l.created_at).toDateString() === today
        )

        setStats(prevStats => ({
          totalLeads: leads.length,
          syncedToday: todayLeads.length,
          activeForms: leadForms.filter(f => f.status === 'ACTIVE').length,
          lastSync: leads[0]?.created_at || null
        }))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handlePageSelect = async (pageId: string) => {
    setSelectedPageId(pageId)
    // Fetch lead forms for the newly selected page
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data: orgData } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    if (orgData?.organization_id) {
      await fetchLeadForms(pageId, orgData.organization_id)
    }
  }

  const handleSetPrimaryPage = async () => {
    if (!selectedPageId || !connection) return
    
    setSavingPage(true)
    try {
      // First, unset any existing primary pages
      const { error: unsetError } = await supabase
        .from('facebook_pages')
        .update({ is_primary: false })
        .eq('integration_id', connection.id)
      
      if (unsetError) throw unsetError
      
      // Then set the selected page as primary
      const { error: setError } = await supabase
        .from('facebook_pages')
        .update({ is_primary: true })
        .eq('integration_id', connection.id)
        .eq('facebook_page_id', selectedPageId)
      
      if (setError) throw setError
      
      // Update local state
      const updatedPages = connection.pages?.map(page => ({
        ...page,
        is_primary: page.facebook_page_id === selectedPageId
      }))
      
      setConnection({
        ...connection,
        pages: updatedPages
      })
      
      toast.success('Primary page updated successfully')
    } catch (error) {
      console.error('Error updating primary page:', error)
      toast.error('Failed to update primary page')
    } finally {
      setSavingPage(false)
    }
  }

  const handleFormToggle = (formId: string) => {
    setSelectedForms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(formId)) {
        newSet.delete(formId)
      } else {
        newSet.add(formId)
      }
      return newSet
    })
  }

  const handleSelectAllForms = () => {
    if (selectedForms.size === leadForms.length) {
      setSelectedForms(new Set())
    } else {
      setSelectedForms(new Set(leadForms.map(f => f.id)))
    }
  }

  const handleSaveSelectedForms = async () => {
    if (!selectedPageId || !connection) return
    
    setSavingForms(true)
    try {
      // Save selected forms configuration
      const response = await fetch('/api/integrations/facebook/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedPages: [selectedPageId],
          selectedForms: Array.from(selectedForms),
          selectedAdAccounts: []
        })
      })

      if (response.ok) {
        toast.success('Lead forms selection saved successfully')
      } else {
        throw new Error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving selected forms:', error)
      toast.error('Failed to save selected forms')
    } finally {
      setSavingForms(false)
    }
  }

  const handleConnect = () => {
    // Set cookie to return to settings after connection
    document.cookie = 'facebook_connect_from_settings=true;path=/;max-age=300' // 5 minute expiry
    
    // Initiate Facebook OAuth flow with proper permissions
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval,ads_management,ads_read,business_management'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=atlas_fitness_oauth`
    
    window.location.href = oauthUrl
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Facebook? This will stop syncing new leads.')) {
      return
    }

    try {
      const response = await fetch('/api/integrations/facebook/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem('facebook_connected')
        localStorage.removeItem('facebook_user_id')
        localStorage.removeItem('facebook_user_name')
        
        setConnection(null)
        setLeadForms([])
        toast.success('Facebook disconnected successfully')
        
        // Refresh the page to reset state
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect Facebook')
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/facebook/sync-leads', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Synced ${data.count || 0} new leads`)
        await fetchConnectionStatus()
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      toast.error('Failed to sync leads')
    } finally {
      setSyncing(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      // Use the correct test-connection endpoint that exists
      const response = await fetch('/api/integrations/facebook/test-connection', {
        method: 'GET'
      })

      if (response.ok) {
        toast.success('Connection test successful!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Connection test failed')
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      toast.error(error instanceof Error ? error.message : 'Connection test failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading Facebook integration...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Facebook className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Facebook & Meta Ads Integration</h1>
        </div>
        <p className="text-gray-400">
          Connect your Facebook Page to automatically sync leads from Meta Ads and lead forms
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Connection Status</h2>
          {connection && (
            <button
              onClick={handleTestConnection}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Test Connection
            </button>
          )}
        </div>

        {connection ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">
                    {connection.facebook_user_name || 'Facebook User'}
                    {connection.pages && connection.pages.length > 0 && (
                      <span className="text-sm text-gray-400 ml-2">
                        ({connection.pages.find(p => p.is_primary)?.page_name || connection.pages[0]?.page_name})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">Connected {new Date(connection.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Page Selector */}
            {connection?.pages && connection.pages.length > 0 && (
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-2">Selected Page</label>
                    <select
                      value={selectedPageId || ''}
                      onChange={(e) => {
                        e.preventDefault()
                        const newPageId = e.target.value
                        if (newPageId && newPageId !== selectedPageId) {
                          handlePageSelect(newPageId)
                        }
                      }}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select a page...</option>
                      {connection.pages.map(page => (
                        <option key={page.facebook_page_id} value={page.facebook_page_id}>
                          {page.page_name} {page.is_primary ? '(Primary)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSetPrimaryPage}
                    disabled={savingPage || !selectedPageId || connection.pages.find(p => p.facebook_page_id === selectedPageId)?.is_primary}
                    className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPage ? 'Saving...' : 'Set as Primary'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The primary page will be used for lead syncing and automation
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Synced Today</p>
                <p className="text-2xl font-bold text-white">{stats.syncedToday}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Active Forms</p>
                <p className="text-2xl font-bold text-white">{stats.activeForms}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Last Sync</p>
                <p className="text-sm font-medium text-white">
                  {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Not Connected</h3>
            <p className="text-gray-400 mb-6">Connect your Facebook Page to start syncing leads</p>
            <button
              onClick={handleConnect}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
            >
              <Facebook className="h-5 w-5" />
              Connect Facebook Page
            </button>
          </div>
        )}
      </div>

      {/* Lead Forms */}
      {connection && selectedPageId && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Lead Forms 
              {connection.pages?.find(p => p.facebook_page_id === selectedPageId) && (
                <span className="text-sm text-gray-400 ml-2">
                  - {connection.pages.find(p => p.facebook_page_id === selectedPageId)?.page_name}
                </span>
              )}
            </h2>
            <a
              href="https://business.facebook.com/latest/inbox/lead_forms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Manage in Facebook
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {loadingForms ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-gray-400 mt-3">Loading lead forms...</p>
            </div>
          ) : leadForms.length > 0 ? (
            <div className="space-y-4">
              {/* Select All / Save Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedForms.size === leadForms.length && leadForms.length > 0}
                    onChange={handleSelectAllForms}
                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Select All ({selectedForms.size} selected)</span>
                </label>
                <button
                  onClick={handleSaveSelectedForms}
                  disabled={savingForms || selectedForms.size === 0}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {savingForms ? 'Saving...' : `Save Selected Forms (${selectedForms.size})`}
                </button>
              </div>
              
              {/* Lead Forms List */}
              <div className="space-y-3">
                {leadForms.map(form => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedForms.has(form.id)}
                        onChange={() => handleFormToggle(form.id)}
                        className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-white font-medium">{form.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            form.status === 'ACTIVE' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-600 text-gray-400'
                          }`}>
                            {form.status}
                          </span>
                          <span className="text-sm text-gray-400">
                            {form.leads_count} leads
                          </span>
                          {form.last_sync && (
                            <span className="text-sm text-gray-400">
                              Last sync: {new Date(form.last_sync).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`https://business.facebook.com/lead_center/forms/${form.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 ml-3"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-700/30 rounded-lg">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">No lead forms found</p>
              <p className="text-sm text-gray-500 mt-1">
                Create lead forms in Facebook Ads Manager to start collecting leads
              </p>
            </div>
          )}
        </div>
      )}

      {/* Webhook Registration Section */}
      {isConnected && selectedPageId && (
        <div className="mt-6 p-6 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Real-time Lead Sync</h3>
              <p className="text-sm text-gray-400 mt-1">
                Enable instant lead capture when forms are submitted
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  // Register webhook with Facebook
                  const webhookUrl = `${window.location.origin}/api/webhooks/meta/leads`
                  
                  toast.info('Registering webhook with Facebook...')
                  
                  const response = await fetch('/api/integrations/facebook/register-webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      pageId: selectedPageId,
                      webhookUrl,
                      organizationId
                    })
                  })
                  
                  const result = await response.json()
                  
                  if (result.success) {
                    toast.success('Real-time sync enabled! Leads will now sync instantly.')
                  } else {
                    throw new Error(result.error || 'Failed to register webhook')
                  }
                } catch (error) {
                  console.error('Webhook registration error:', error)
                  toast.error('Failed to enable real-time sync. Please try again.')
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Enable Real-time Sync
            </button>
          </div>
          <div className="text-sm text-gray-400">
            <p className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Instant lead capture when forms are submitted
            </p>
            <p className="flex items-center gap-2 mt-1">
              <Check className="h-4 w-4 text-green-400" />
              No delay - leads appear immediately in your CRM
            </p>
            <p className="flex items-center gap-2 mt-1">
              <Check className="h-4 w-4 text-green-400" />
              Automatic retry if connection is temporarily lost
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">How to Set Up Facebook Lead Forms</h3>
        <ol className="space-y-2 text-gray-300 text-sm">
          <li>1. Connect your Facebook Page using the button above</li>
          <li>2. Create lead forms in Facebook Ads Manager or Business Suite</li>
          <li>3. Enable real-time sync for instant lead capture</li>
          <li>4. Launch ads with your lead forms to start collecting leads</li>
          <li>5. Leads will sync instantly or you can manually sync anytime</li>
        </ol>
        <div className="mt-4 flex gap-3">
          <a
            href="https://www.facebook.com/business/help/1462876307360828"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            Learn about lead forms
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://business.facebook.com/adsmanager"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            Open Ads Manager
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}