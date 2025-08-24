'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFacebookConnection } from '@/app/hooks/useFacebookConnection'
import { useFacebookPages, useFacebookAdAccounts, useFacebookLeadForms, useFacebookLeads } from '@/app/hooks/useFacebookData'
import DashboardLayout from '@/app/components/DashboardLayout'
import FacebookDiagnosticPanel from '@/app/components/facebook/DiagnosticPanel'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

interface SelectedItems {
  pages: string[]
  adAccounts: string[]
  leadForms: string[]
}

function FacebookIntegrationContent() {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    pages: [],
    adAccounts: [],
    leadForms: []
  })
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [timeFilter, setTimeFilter] = useState('last_30_days')
  const [webhookStatus, setWebhookStatus] = useState<Record<string, boolean>>({})
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  
  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
  }, [])
  
  // Track if we've attempted initial sync
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false)
  
  const facebookConnection = useFacebookConnection()
  
  // Handle connection state - NO AUTOMATIC REDIRECTS
  useEffect(() => {
    // Check if we just came from a successful callback
    const urlParams = new URLSearchParams(window.location.search)
    const justConnected = urlParams.get('just_connected') === 'true'
    
    if (justConnected) {
      console.log('Just connected via OAuth callback')
      // Remove the parameter from URL to prevent issues on refresh
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('just_connected')
      window.history.replaceState({}, '', newUrl.toString())
      
      // Force a refresh to get latest status
      facebookConnection.refresh()
    }
    
    // REMOVED: Automatic redirect to /connect-facebook
    // Users should manually click "Connect Facebook" button if not connected
  }, [facebookConnection.refresh])
  const { pages, loading: pagesLoading, error: pagesError, refetch: refetchPages } = useFacebookPages(facebookConnection.connected)
  const { adAccounts, loading: adAccountsLoading, error: adAccountsError, refetch: refetchAdAccounts } = useFacebookAdAccounts(facebookConnection.connected, timeFilter)
  const { leadForms, loading: leadFormsLoading, error: leadFormsError, refetch: refetchLeadForms } = useFacebookLeadForms(
    selectedItems.pages.length > 0 ? selectedItems.pages.join(',') : null, 
    facebookConnection.connected && selectedItems.pages.length > 0
  )
  const { leads, loading: leadsLoading, error: leadsError, refetch: refetchLeads } = useFacebookLeads(undefined, selectedPageId, facebookConnection.connected && !!selectedPageId)

  // Auto-sync pages on first connection
  useEffect(() => {
    const syncPagesIfNeeded = async () => {
      if (facebookConnection.connected && !hasAttemptedSync && !pagesLoading && !isSyncing) {
        console.log('Facebook connected, attempting initial sync...')
        setHasAttemptedSync(true)
        setIsSyncing(true)
        setSyncMessage('Syncing pages from Facebook...')
        try {
          const syncRes = await fetch('/api/integrations/meta/sync-pages-fix', {
            method: 'POST'
          })
          
          if (syncRes.ok) {
            const result = await syncRes.json()
            console.log('Initial sync completed:', result)
            setSyncMessage(result.message || 'Pages synced successfully')
            // Refresh pages after sync
            await refetchPages()
          } else {
            const error = await syncRes.json()
            if (error.fixed) {
              // Retry if configuration was fixed
              const retryRes = await fetch('/api/integrations/meta/sync-pages-fix', {
                method: 'POST'
              })
              if (retryRes.ok) {
                const retryResult = await retryRes.json()
                setSyncMessage(retryResult.message || 'Pages synced successfully')
                await refetchPages()
              } else {
                const retryError = await retryRes.json()
                setSyncMessage(`Failed to sync: ${retryError.error || 'Unknown error'}`)
              }
            } else {
              setSyncMessage(`Failed to sync: ${error.error || 'Unknown error'}`)
            }
          }
        } catch (error) {
          console.error('Initial sync error:', error)
          setSyncMessage('Failed to sync pages from Facebook')
        } finally {
          setIsSyncing(false)
          // Clear message after 5 seconds
          setTimeout(() => setSyncMessage(''), 5000)
        }
      }
    }
    
    syncPagesIfNeeded()
  }, [facebookConnection.connected, hasAttemptedSync, pagesLoading, isSyncing, refetchPages])

  const handleConnect = () => {
    setConnecting(true)
    setError('')
    
    // Simple redirect to Facebook OAuth with all required permissions
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval,ads_management,ads_read,business_management'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=atlas_fitness_oauth`
    
    window.location.href = oauthUrl
  }

  // Check webhook status for selected pages
  useEffect(() => {
    const checkWebhookStatus = async () => {
      if (selectedItems.pages.length === 0) return
      
      const statuses: Record<string, boolean> = {}
      
      for (const pageId of selectedItems.pages) {
        const page = pages.find(p => p.id === pageId)
        if (page?.access_token) {
          try {
            const res = await fetch(`/api/integrations/facebook/activate-page-webhook?pageId=${pageId}&pageAccessToken=${page.access_token}`)
            const data = await res.json()
            statuses[pageId] = data.isSubscribed || false
          } catch (error) {
            console.error(`Error checking webhook status for page ${pageId}:`, error)
            statuses[pageId] = false
          }
        }
      }
      
      setWebhookStatus(statuses)
    }
    
    checkWebhookStatus()
  }, [selectedItems.pages, pages])

  return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🔗 Connect Facebook Ads</h1>
          <p className="text-gray-300 text-lg">
            Connect your Facebook ad account to automatically capture and manage leads from your Facebook advertising campaigns.
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">What you'll get:</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Automatic lead capture from Facebook Lead Ads
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Real-time lead notifications and follow-up
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Lead qualification and scoring
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Integration with your CRM and communication tools
            </li>
          </ul>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Connection Status</h3>
          {facebookConnection.loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-gray-300">Checking connection status...</span>
            </div>
          ) : facebookConnection.connected ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-green-400">Connected</span>
                </div>
                <span className="text-gray-400 text-sm">
                  {facebookConnection.connectedAt && 
                    `Connected on ${new Date(facebookConnection.connectedAt).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={facebookConnection.disconnect}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Disconnect
                </button>
                <button 
                  onClick={facebookConnection.refresh}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-300">Not Connected</span>
              </div>
              <span className="text-gray-400 text-sm">No Facebook account connected</span>
            </div>
          )}
          
          {/* Debug Info */}
          {facebookConnection.debug && (
            <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-400">
              <strong>Debug Info:</strong> Last checked: {facebookConnection.debug.lastChecked} | 
              Raw value: {facebookConnection.debug.rawValue || 'null'}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <h4 className="text-red-200 font-medium mb-2">Connection Error</h4>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Facebook Data Sections - Only show when connected */}
        {facebookConnection.connected && (
          <>
            {/* Diagnostic Panel - Show when there's an error or no pages */}
            {(pagesError || (pages.length === 0 && !pagesLoading)) && (
              <div className="mb-6">
                <FacebookDiagnosticPanel />
              </div>
            )}

            {/* Facebook Pages Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Your Facebook Pages</h3>
                  <p className="text-gray-400 text-sm">Select the page that contains your lead forms</p>
                </div>
                <button 
                  onClick={async () => {
                    setIsSyncing(true)
                    setSyncMessage('')
                    try {
                      // First sync pages from Facebook API
                      const syncRes = await fetch('/api/integrations/meta/sync-pages', {
                        method: 'POST'
                      })
                      
                      if (!syncRes.ok) {
                        const error = await syncRes.json()
                        console.error('Sync error:', error)
                        setSyncMessage(error.error || 'Failed to sync pages')
                        throw new Error(error.error || 'Failed to sync pages')
                      }
                      
                      const syncResult = await syncRes.json()
                      console.log('Sync result:', syncResult)
                      setSyncMessage(syncResult.message || 'Pages synced successfully')
                      
                      // Then refresh the local data
                      await refetchPages()
                    } catch (error) {
                      console.error('Error syncing pages:', error)
                      setSyncMessage(`Error: ${error.message}`)
                    } finally {
                      setIsSyncing(false)
                      // Clear message after 5 seconds
                      setTimeout(() => setSyncMessage(''), 5000)
                    }
                  }}
                  disabled={pagesLoading || isSyncing}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                >
                  {isSyncing ? (
                    <>
                      <svg className="animate-spin inline-block w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </>
                  ) : 'Refresh'}
                </button>
              </div>

              {syncMessage && (
                <div className={`rounded p-3 mb-4 ${syncMessage.includes('Error') || syncMessage.includes('Failed') ? 'bg-red-900 border border-red-600' : 'bg-green-900 border border-green-600'}`}>
                  <p className={`text-sm ${syncMessage.includes('Error') || syncMessage.includes('Failed') ? 'text-red-300' : 'text-green-300'}`}>{syncMessage}</p>
                </div>
              )}

              {pagesError && !syncMessage && (
                <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                  <p className="text-red-300 text-sm">Error: {pagesError}</p>
                </div>
              )}

              {pagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-gray-300">Loading your Facebook pages...</span>
                </div>
              ) : pages.length > 0 ? (
                <div className="grid gap-4">
                  {pages.map((page) => (
                    <div 
                      key={page.id}
                      className={`border rounded-lg p-4 transition-all ${
                        selectedItems.pages.includes(page.id)
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          id={`page-${page.id}`}
                          checked={selectedItems.pages.includes(page.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => ({
                                ...prev,
                                pages: [...prev.pages, page.id]
                              }))
                            } else {
                              setSelectedItems(prev => ({
                                ...prev,
                                pages: prev.pages.filter(id => id !== page.id)
                              }))
                            }
                          }}
                          className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`page-${page.id}`} className="flex items-center space-x-4 flex-1 cursor-pointer">
                          {page.cover && (
                            <img 
                              src={page.cover} 
                              alt={page.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{page.name}</h4>
                            {page.category && (
                              <p className="text-gray-400 text-sm">{page.category}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              {page.followers_count !== undefined && page.followers_count !== null && (
                                <span>{page.followers_count.toLocaleString()} followers</span>
                              )}
                              <span className={`px-2 py-1 rounded ${page.hasLeadAccess ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                                {page.hasLeadAccess ? 'Lead Access ✓' : 'No Lead Access'}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isSyncing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-gray-300">Syncing pages from Facebook API...</span>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <p className="mb-2">No Facebook pages found.</p>
                    <p className="text-sm">This could mean:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• You don't have admin access to any Facebook pages</li>
                      <li>• The pages haven't been synced from Facebook yet</li>
                      <li>• There was an issue with permissions</li>
                    </ul>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSyncing(true)
                      setSyncMessage('Syncing pages from Facebook...')
                      try {
                        // Try the fixed endpoint first
                        const syncRes = await fetch('/api/integrations/meta/sync-pages-fix', {
                          method: 'POST'
                        })
                        
                        if (syncRes.ok) {
                          const result = await syncRes.json()
                          setSyncMessage(result.message || 'Pages synced successfully')
                          await refetchPages()
                        } else {
                          const error = await syncRes.json()
                          
                          // If it was a configuration issue that got fixed, retry
                          if (error.fixed) {
                            setSyncMessage('Fixed configuration issue. Retrying...')
                            const retryRes = await fetch('/api/integrations/meta/sync-pages-fix', {
                              method: 'POST'
                            })
                            if (retryRes.ok) {
                              const retryResult = await retryRes.json()
                              setSyncMessage(retryResult.message || 'Pages synced successfully')
                              await refetchPages()
                            } else {
                              const retryError = await retryRes.json()
                              setSyncMessage(`Failed: ${retryError.error || 'Unknown error'}`)
                            }
                          } else {
                            setSyncMessage(`Failed: ${error.error || 'Unknown error'}`)
                          }
                        }
                      } catch (error) {
                        setSyncMessage('Failed to sync pages')
                      } finally {
                        setIsSyncing(false)
                        setTimeout(() => setSyncMessage(''), 5000)
                      }
                    }}
                    disabled={isSyncing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded transition-colors"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Pages from Facebook'}
                  </button>
                </div>
              )}
            </div>

            {/* Webhook Activation Section */}
            {selectedItems.pages.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold">Activate Instant Leads</h3>
                  <p className="text-gray-400 text-sm">Enable real-time webhook notifications for each page</p>
                </div>

                <div className="space-y-3">
                  {pages
                    .filter(page => selectedItems.pages.includes(page.id))
                    .map((page) => {
                      const isActive = webhookStatus[page.id] || false
                      return (
                        <div key={page.id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{page.name}</h4>
                            <p className={`text-sm mt-1 ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                              {isActive 
                                ? '✅ Receiving instant leads' 
                                : '⚠️ Click to activate instant leads'}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/integrations/facebook/activate-page-webhook', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    pageId: page.id,
                                    pageAccessToken: page.access_token
                                  })
                                })
                                
                                const data = await res.json()
                                
                                if (data.success) {
                                  setWebhookStatus(prev => ({ ...prev, [page.id]: true }))
                                  alert(`✅ Instant leads activated for ${page.name}!`)
                                  // Refresh pages to get updated status
                                  refetchPages()
                                } else {
                                  alert(`Failed: ${data.error || 'Unknown error'}`)
                                }
                              } catch (error) {
                                console.error('Error activating webhook:', error)
                                alert('Failed to activate webhook')
                              }
                            }}
                            className={`${
                              isActive 
                                ? 'bg-gray-600 hover:bg-gray-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors`}
                          >
                            {isActive ? 'Webhook Active' : 'Activate Instant Leads'}
                          </button>
                        </div>
                      )
                    })}
                </div>

                <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-400">
                    <strong>Note:</strong> After activating, Facebook will send new lead data to your webhook in real-time. 
                    Make sure your webhook endpoint is properly configured.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Webhook URL: <code className="bg-gray-800 px-1 rounded">{window.location.origin}/api/webhooks/facebook-leads</code></p>
                    <p>Verify Token: <code className="bg-gray-800 px-1 rounded">gym_webhook_verify_2024</code></p>
                  </div>
                </div>
              </div>
            )}

            {/* Ad Accounts Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Ad Accounts</h3>
                  <p className="text-gray-400 text-sm">Your connected advertising accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Time Filter */}
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days">Last 7 days</option>
                    <option value="last_30_days">Last 30 days</option>
                    <option value="last_90_days">Last 90 days</option>
                    <option value="this_month">This month</option>
                    <option value="last_month">Last month</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                  <button 
                    onClick={refetchAdAccounts}
                    disabled={adAccountsLoading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                  >
                    {adAccountsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {adAccountsError && (
                <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                  <p className="text-red-300 text-sm">Error: {adAccountsError}</p>
                </div>
              )}

              {adAccountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-gray-300">Loading your ad accounts...</span>
                </div>
              ) : adAccounts.length > 0 ? (
                <div className="grid gap-4">
                  {adAccounts.map((account) => (
                    <div key={account.id} className={`border rounded-lg p-4 transition-all ${
                      selectedItems.adAccounts.includes(account.id)
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}>
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          id={`ad-account-${account.id}`}
                          checked={selectedItems.adAccounts.includes(account.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => ({
                                ...prev,
                                adAccounts: [...prev.adAccounts, account.id]
                              }))
                            } else {
                              setSelectedItems(prev => ({
                                ...prev,
                                adAccounts: prev.adAccounts.filter(id => id !== account.id)
                              }))
                            }
                          }}
                          className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 mt-1"
                        />
                        <label htmlFor={`ad-account-${account.id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-white">{account.name}</h4>
                              <p className="text-gray-400 text-sm">{account.id}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              account.status_color === 'green' ? 'bg-green-800 text-green-200' :
                              account.status_color === 'red' ? 'bg-red-800 text-red-200' :
                              account.status_color === 'yellow' ? 'bg-yellow-800 text-yellow-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {account.status}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                            <div>
                              <p className="text-gray-400">Spent</p>
                              <p className="text-white">£{account.amount_spent.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Balance</p>
                              <p className="text-white">£{account.balance.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Currency</p>
                              <p className="text-white">{account.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Funding</p>
                              <p className="text-white">{account.funding_source}</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No ad accounts found. Make sure you have access to advertising accounts.</p>
                </div>
              )}
            </div>

            {/* Lead Forms Section */}
            {selectedItems.pages.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Lead Forms</h3>
                    <p className="text-gray-400 text-sm">Select forms to sync with your CRM</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={refetchLeadForms}
                      disabled={leadFormsLoading}
                      className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                    >
                      {leadFormsLoading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          console.log('🔍 Debug: Testing lead forms API...')
                          const pageIds = selectedItems.pages.join(',')
                          console.log('Selected page IDs:', pageIds)
                          
                          const res = await fetch(`/api/integrations/facebook/lead-forms?pageIds=${pageIds}`)
                          const data = await res.json()
                          
                          console.log('Lead Forms API Response:', data)
                          
                          // Show detailed debug info
                          const debugInfo = {
                            status: res.status,
                            formsFound: data.forms?.length || 0,
                            errors: data.errors,
                            debug: data.debug,
                            summary: data.summary,
                            firstForm: data.forms?.[0],
                            rawResponse: data
                          }
                          
                          console.log('Debug Info:', debugInfo)
                          alert(JSON.stringify(debugInfo, null, 2))
                          
                        } catch (error) {
                          console.error('Debug error:', error)
                          alert(`Error: ${error.message}`)
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm transition-colors"
                    >
                      Debug API
                    </button>
                  </div>
                </div>

                {leadFormsError && (
                  <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                    <p className="text-red-300 text-sm">Error: {leadFormsError}</p>
                  </div>
                )}

                {leadFormsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-gray-300">Loading lead forms...</span>
                  </div>
                ) : leadForms.length > 0 ? (
                  <div className="space-y-4">
                    {/* Debug info if available */}
                    {leadForms.length > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-900 rounded p-3">
                        <p>Found {leadForms.length} lead forms • {leadForms.filter(f => f.is_active).length} active</p>
                        <p>Total leads collected: {leadForms.reduce((sum, f) => {
                          const count = f.leads_count
                          if (typeof count === 'number') return sum + count
                          if (typeof count === 'string' && count.endsWith('+')) {
                            return sum + parseInt(count.replace('+', ''))
                          }
                          return sum + (parseInt(count as string) || 0)
                        }, 0)}</p>
                        <p className="text-gray-600 mt-1">
                          Time period: {timeFilter === 'today' ? 'Today' :
                                       timeFilter === 'yesterday' ? 'Yesterday' :
                                       timeFilter === 'last_7_days' ? 'Last 7 days' :
                                       timeFilter === 'last_30_days' ? 'Last 30 days' :
                                       timeFilter === 'last_90_days' ? 'Last 90 days' :
                                       timeFilter === 'this_month' ? 'This month' :
                                       timeFilter === 'last_month' ? 'Last month' :
                                       'Lifetime'}
                        </p>
                      </div>
                    )}
                    
                    {leadForms.map((form) => (
                      <div key={form.id} className={`border rounded-lg p-4 transition-all ${
                        selectedItems.leadForms.includes(form.id)
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}>
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            id={`lead-form-${form.id}`}
                            checked={selectedItems.leadForms.includes(form.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(prev => ({
                                  ...prev,
                                  leadForms: [...prev.leadForms, form.id]
                                }))
                              } else {
                                setSelectedItems(prev => ({
                                  ...prev,
                                  leadForms: prev.leadForms.filter(id => id !== form.id)
                                }))
                              }
                            }}
                            className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 mt-1"
                          />
                          <label htmlFor={`lead-form-${form.id}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-white">{form.name}</h4>
                                <p className="text-gray-400 text-sm">{form.context_card.description}</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                form.is_active ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300'
                              }`}>
                                {form.status}
                              </div>
                            </div>
                        
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Leads Collected</p>
                                <div className="flex items-center gap-2">
                                  <p className={`font-semibold ${
                                    (typeof form.leads_count === 'number' ? form.leads_count > 0 : form.leads_count !== '0' && form.leads_count !== '') ? 'text-green-400' : 'text-white'
                                  }`}>
                                    {form.leads_count || 0}
                                  </p>
                                  {(form.leads_count === 0 || form.leads_count === '0') && form.lead_access_error && (
                                    <span className="text-xs text-orange-400" title={form.lead_access_error}>
                                      (Check permissions)
                                    </span>
                                  )}
                                  {form.can_access_leads && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        const button = e.currentTarget
                                        button.disabled = true
                                        button.textContent = '...'
                                        
                                        try {
                                          const res = await fetch('/api/integrations/facebook/get-lead-count', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                              formId: form.id,
                                              pageId: form.pageId
                                            })
                                          })
                                          
                                          const data = await res.json()
                                          
                                          if (data.success) {
                                            // Update the display with actual count
                                            const countElement = button.previousElementSibling as HTMLElement
                                            if (countElement) {
                                              countElement.textContent = data.leadCount.toString()
                                              if (data.leadCount > 0) {
                                                countElement.classList.remove('text-white')
                                                countElement.classList.add('text-green-400')
                                              }
                                            }
                                            button.style.display = 'none'
                                            
                                            // Show sync button if leads > 0
                                            if (data.leadCount > 0) {
                                              const syncButton = document.createElement('button')
                                              syncButton.className = 'text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors'
                                              syncButton.textContent = 'Sync'
                                              syncButton.onclick = async () => {
                                                try {
                                                  const syncRes = await fetch('/api/integrations/facebook/sync-form-leads', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ 
                                                      formId: form.id,
                                                      formName: form.name,
                                                      pageId: form.pageId
                                                    })
                                                  })
                                                  const syncData = await syncRes.json()
                                                  if (syncData.success) {
                                                    alert(`Synced ${syncData.syncedCount} leads from ${form.name}`)
                                                  } else {
                                                    alert(`Failed to sync: ${syncData.error}`)
                                                  }
                                                } catch (error) {
                                                  alert('Failed to sync leads')
                                                }
                                              }
                                              button.parentElement?.appendChild(syncButton)
                                            }
                                          } else {
                                            alert(`Error: ${data.error}`)
                                            button.textContent = '↻'
                                            button.disabled = false
                                          }
                                        } catch (error) {
                                          console.error('Count error:', error)
                                          alert('Failed to get lead count')
                                          button.textContent = '↻'
                                          button.disabled = false
                                        }
                                      }}
                                      className="text-xs text-gray-400 hover:text-white px-1"
                                      title="Refresh lead count"
                                    >
                                      ↻
                                    </button>
                                  )}
                                  {(typeof form.leads_count === 'number' ? form.leads_count > 0 : form.leads_count !== '0' && form.leads_count !== '') && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          const res = await fetch('/api/integrations/facebook/sync-form-leads', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                              formId: form.id,
                                              formName: form.name,
                                              pageId: form.pageId
                                            })
                                          })
                                          
                                          const data = await res.json()
                                          
                                          if (data.success) {
                                            alert(`Synced ${data.syncedCount} leads from ${form.name}`)
                                          } else {
                                            alert(`Failed to sync: ${data.error}`)
                                          }
                                        } catch (error) {
                                          console.error('Sync error:', error)
                                          alert('Failed to sync leads')
                                        }
                                      }}
                                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                                    >
                                      Sync
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-400">Questions</p>
                                <p className="text-white">{form.questions_count || 0} fields</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Created</p>
                                <p className="text-white">{form.created_time_formatted || (form.created_time ? new Date(form.created_time).toLocaleDateString('en-GB') : 'Unknown')}</p>
                              </div>
                            </div>
                            {form.error && (
                              <div className="mt-2 text-xs text-red-400">
                                ⚠️ {form.error}
                              </div>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/integrations/facebook/test-form/${form.id}`)
                                  const data = await res.json()
                                  console.log('Form test:', data)
                                  alert(JSON.stringify(data, null, 2))
                                } catch (error) {
                                  console.error('Test error:', error)
                                  alert(`Error: ${error.message}`)
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                              title="Test form access"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/integrations/facebook/test-lead-count', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      formId: form.id,
                                      pageId: form.pageId
                                    })
                                  })
                                  const data = await res.json()
                                  console.log('Lead count test:', data)
                                  alert(JSON.stringify(data, null, 2))
                                } catch (error) {
                                  console.error('Test error:', error)
                                  alert(`Error: ${error.message}`)
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                              title="Test lead count"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6">
                      <div className="flex items-start space-x-3">
                        <div className="text-yellow-400 mt-0.5">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-yellow-200 font-semibold mb-2">No Lead Forms Found</h4>
                          <p className="text-gray-300 mb-4">
                            You need to create lead forms in Facebook Ads Manager first:
                          </p>
                          <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                            <li>Go to <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Facebook Ads Manager</a></li>
                            <li>Navigate to All Tools → Instant Forms</li>
                            <li>Click "Create Form" for your selected pages</li>
                            <li>Set up your form questions and privacy policy</li>
                            <li>After publishing, click "Refresh" here to see your forms</li>
                          </ol>
                          {leadFormsError && (
                            <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded">
                              <p className="text-red-300 text-sm">
                                <strong>Error details:</strong> {leadFormsError}
                              </p>
                            </div>
                          )}
                          
                          {/* Graph API Explorer Help */}
                          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded">
                            <h5 className="text-blue-200 font-semibold mb-2">🔍 Debug with Graph API Explorer</h5>
                            <p className="text-gray-300 text-sm mb-3">
                              To verify your forms exist and check permissions:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
                              <li>Go to <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Graph API Explorer</a></li>
                              <li>Select your app: <span className="text-white">Atlas Fitness (715100284200848)</span></li>
                              <li>Get a Page Access Token for your selected pages</li>
                              <li>Run query: <code className="bg-gray-800 px-2 py-1 rounded">/{selectedItems.pages[0]}/leadgen_forms</code></li>
                              <li>Check if forms appear there but not here</li>
                            </ol>
                            <div className="mt-3 p-3 bg-gray-800 rounded">
                              <p className="text-xs text-gray-400 mb-1">Common issues:</p>
                              <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                <li>Using User Token instead of Page Token</li>
                                <li>Missing leads_retrieval permission</li>
                                <li>Forms are archived or draft status</li>
                                <li>Page doesn't have admin permissions</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Real-time Sync Alert */}
            {selectedItems.leadForms.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-400 mt-0.5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-blue-200 font-semibold mb-2">Real-time Lead Sync</h4>
                    <p className="text-gray-300 text-sm mb-4">
                      To receive leads instantly like GoHighLevel:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm mb-4">
                      <li>Select the forms you want to sync</li>
                      <li>We'll set up webhooks for real-time delivery</li>
                      <li>New leads will appear instantly in your CRM</li>
                    </ol>
                    <button
                      onClick={async () => {
                        if (selectedItems.leadForms.length === 0) {
                          alert('Please select at least one lead form first')
                          return
                        }
                        
                        try {
                          for (const formId of selectedItems.leadForms) {
                            const res = await fetch('/api/integrations/facebook/register-webhook', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ formId })
                            })
                            
                            if (!res.ok) {
                              throw new Error(`Failed to register webhook for form ${formId}`)
                            }
                          }
                          
                          alert(`Successfully enabled real-time sync for ${selectedItems.leadForms.length} forms!`)
                        } catch (error) {
                          console.error('Webhook registration error:', error)
                          alert('Failed to enable real-time sync. Please try again.')
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Enable Real-time Sync
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Leads Section */}
            {selectedPageId && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Recent Leads</h3>
                    <p className="text-gray-400 text-sm">Latest leads from your Facebook ads</p>
                  </div>
                  <button 
                    onClick={refetchLeads}
                    disabled={leadsLoading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                  >
                    {leadsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {leadsError && (
                  <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                    <p className="text-red-300 text-sm">Error: {leadsError}</p>
                  </div>
                )}

                {leadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-gray-300">Loading leads...</span>
                  </div>
                ) : leads.length > 0 ? (
                  <div className="space-y-4">
                    {leads.slice(0, 10).map((lead) => (
                      <div key={lead.id} className="border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-white">
                                {lead.processed_data.full_name || lead.processed_data.email || 'Unknown Lead'}
                              </h4>
                              <span className="text-xs text-gray-400">
                                {new Date(lead.created_time).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              {lead.processed_data.email && (
                                <p className="text-gray-300">
                                  📧 {lead.processed_data.email}
                                </p>
                              )}
                              {lead.processed_data.phone_number && (
                                <p className="text-gray-300">
                                  📞 {lead.processed_data.phone_number}
                                </p>
                              )}
                              {Object.entries(lead.processed_data).map(([key, value]) => {
                                if (!value || key === 'full_name' || key === 'email' || key === 'phone_number') return null
                                return (
                                  <p key={key} className="text-gray-400 text-xs">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                                  </p>
                                )
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              lead.is_organic ? 'bg-green-800 text-green-200' : 'bg-blue-800 text-blue-200'
                            }`}>
                              {lead.is_organic ? 'Organic' : 'Paid Ad'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-700 pt-3 mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
                            <div>
                              <span className="font-medium">Campaign:</span> {lead.campaign_name}
                            </div>
                            <div>
                              <span className="font-medium">Ad:</span> {lead.ad_name}
                            </div>
                            <div>
                              <span className="font-medium">Form:</span> {lead.form_id}
                            </div>
                            <div>
                              <span className="font-medium">Platform:</span> {lead.platform}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs transition-colors">
                            Contact
                          </button>
                          <button className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs transition-colors">
                            Add to CRM
                          </button>
                          <button className="text-gray-400 hover:text-white text-xs transition-colors">
                            View Full Details
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {leads.length > 10 && (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">
                          Showing 10 of {leads.length} leads.
                        </p>
                        <button className="text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors">
                          View All Leads →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No leads found for this page. Make sure your ads are running and generating leads.</p>
                    <p className="text-sm mt-2">
                      {facebookConnection.connected ? 
                        "Connected to Facebook, but no leads available yet." : 
                        "Connect to Facebook to see your leads."
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Save Configuration Button */}
            {(selectedItems.pages.length > 0 || selectedItems.adAccounts.length > 0) && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold mb-4">Configuration Summary</h3>
                  <div className="text-gray-300 mb-6 space-y-2">
                    <p>{selectedItems.pages.length} pages selected</p>
                    <p>{selectedItems.adAccounts.length} ad accounts selected</p>
                    <p>{selectedItems.leadForms.length} lead forms selected</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={async () => {
                        setSaving(true)
                        setError('')
                        
                        try {
                          const res = await fetch('/api/integrations/facebook/save-config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              selectedPages: selectedItems.pages,
                              selectedAdAccounts: selectedItems.adAccounts,
                              selectedForms: selectedItems.leadForms
                            })
                          })
                          
                          if (res.ok) {
                            // Show success message
                            alert('Configuration saved! Lead syncing will begin shortly.')
                            router.push('/dashboard')
                          } else {
                            const data = await res.json()
                            setError(data.error || 'Failed to save configuration')
                          }
                        } catch (err) {
                          setError('Failed to save configuration')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving || selectedItems.leadForms.length === 0}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all"
                    >
                      {saving ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Saving Configuration...
                        </div>
                      ) : (
                        'Save Configuration & Start Syncing Leads'
                      )}
                    </button>
                    
                    {/* Sync Leads Button */}
                    <button
                      onClick={async () => {
                        const syncButton = event.target as HTMLButtonElement
                        syncButton.disabled = true
                        const originalText = syncButton.textContent
                        syncButton.textContent = 'Syncing...'
                        
                        try {
                          const syncData: any = {}
                          
                          // If specific forms selected, sync those
                          if (selectedItems.leadForms.length > 0) {
                            // Sync each form individually for better control
                            for (const formId of selectedItems.leadForms) {
                              // Find which page this form belongs to
                              const pageId = selectedItems.pages[0] // For now, use first selected page
                              syncData.formId = formId
                              syncData.pageId = pageId
                              
                              const res = await fetch('/api/integrations/facebook/sync-leads', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(syncData)
                              })
                              
                              if (!res.ok) {
                                throw new Error('Failed to sync leads')
                              }
                            }
                          } else if (selectedItems.pages.length > 0) {
                            // Sync all forms from selected pages
                            for (const pageId of selectedItems.pages) {
                              syncData.pageId = pageId
                              
                              const res = await fetch('/api/integrations/facebook/sync-leads', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(syncData)
                              })
                              
                              if (!res.ok) {
                                throw new Error('Failed to sync leads')
                              }
                            }
                          } else {
                            // Sync all leads from all pages
                            const res = await fetch('/api/integrations/facebook/sync-leads', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({})
                            })
                            
                            if (!res.ok) {
                              throw new Error('Failed to sync leads')
                            }
                          }
                          
                          alert('Leads synced successfully! Check the Leads page to view them.')
                          
                        } catch (err) {
                          console.error('Sync error:', err)
                          alert('Failed to sync leads. Please try again.')
                        } finally {
                          syncButton.disabled = false
                          syncButton.textContent = originalText || 'Sync Leads Now'
                        }
                      }}
                      disabled={!facebookConnection.connected}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all"
                    >
                      Sync Leads Now
                    </button>
                  </div>
                  {selectedItems.leadForms.length === 0 && selectedItems.pages.length > 0 && (
                    <p className="text-yellow-400 text-sm mt-4">
                      Please select at least one lead form to start syncing
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Connect Button - Only show when NOT connected */}
        {!facebookConnection.connected && (
        <div className="text-center">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {connecting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Connecting to Facebook...
              </div>
            ) : (
              'Connect Facebook Account'
            )}
          </button>
          
          <p className="text-gray-400 text-sm mt-4">
            You'll be redirected to Facebook to authorize the connection. 
            This is secure and you can revoke access anytime.
          </p>
        </div>
        )}

        {/* Setup Requirements */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold mb-4">Setup Requirements</h3>
          <div className="space-y-3 text-gray-300 text-sm">
            <p>
              <strong>Note:</strong> To use this integration, you'll need:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>A Facebook Business account</li>
              <li>Facebook Pages with lead forms</li>
              <li>Admin access to your Facebook ad accounts</li>
            </ul>
            <p className="text-orange-400 mt-4">
              💡 <strong>Tip:</strong> If you haven't set up your Facebook app yet, you'll need to configure it first. 
              The integration requires proper Facebook App ID and permissions.
            </p>
          </div>
        </div>
      </div>
  )
}

export default function FacebookIntegrationPage() {
  const [userData, setUserData] = useState<any>(null)
  
  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
  }, [])
  
  return (
    <DashboardLayout userData={userData}>
      <ErrorBoundary componentName="Facebook Integration">
        <FacebookIntegrationContent />
      </ErrorBoundary>
    </DashboardLayout>
  )
}