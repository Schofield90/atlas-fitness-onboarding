'use client'

import { useState, useEffect } from 'react'
import Button from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'

interface MetaIntegrationStatus {
  connected: boolean
  user_name?: string
  user_email?: string
  last_sync_at?: string
  pages_count?: number
  forms_count?: number
  accounts_count?: number
}

interface MetaAdsConnectionProps {
  onConnectionChange?: (connected: boolean) => void
}

export default function MetaAdsConnection({ onConnectionChange }: MetaAdsConnectionProps) {
  const [status, setStatus] = useState<MetaIntegrationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/integrations/meta/status')
      const data = await response.json()

      if (data.success) {
        setStatus(data.status)
        onConnectionChange?.(data.status.connected)
      } else {
        setError(data.error || 'Failed to check connection status')
      }
    } catch (error) {
      console.error('Failed to check connection status:', error)
      setError('Failed to check connection status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    
    const permissions = [
      'pages_show_list',
      'pages_read_engagement', 
      'pages_manage_metadata',
      'leads_retrieval',
      'ads_read',
      'ads_management',
      'business_management'
    ]

    const scope = permissions.join(',')
    const state = 'atlas_fitness_oauth'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `response_type=code`

    window.location.href = oauthUrl
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Meta Ads account? This will stop lead synchronization and campaign tracking.')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/integrations/meta/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        setStatus(null)
        onConnectionChange?.(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      setError('Failed to disconnect')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncData = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      // Sync pages first
      const pagesResponse = await fetch('/api/integrations/meta/sync-pages', {
        method: 'POST'
      })
      const pagesData = await pagesResponse.json()

      if (!pagesData.success) {
        throw new Error(pagesData.error || 'Failed to sync pages')
      }

      // Sync ad accounts
      const accountsResponse = await fetch('/api/integrations/meta/sync-ad-accounts', {
        method: 'POST'
      })
      const accountsData = await accountsResponse.json()

      if (!accountsData.success) {
        throw new Error(accountsData.error || 'Failed to sync ad accounts')
      }

      // Refresh status
      await checkConnectionStatus()

      // Success feedback
      alert(`Successfully synced ${pagesData.summary.successful} pages and ${accountsData.summary.successful} ad accounts`)

    } catch (error: any) {
      console.error('Sync failed:', error)
      setError(error.message || 'Failed to sync data')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Meta Ads Integration</h3>
          <p className="text-sm text-gray-600">
            Connect your Facebook/Meta Ads account to sync leads and track campaign performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {status?.connected && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!status?.connected ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">Connection Required</h4>
                <p className="text-sm">
                  Connect your Meta Ads account to enable lead synchronization, 
                  campaign tracking, and audience retargeting features.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleConnect} className="w-full">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Connect Meta Ads Account
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Connected As</div>
              <div className="font-medium">{status.user_name}</div>
              <div className="text-xs text-gray-500">{status.user_email}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Pages</div>
              <div className="text-2xl font-bold">{status.pages_count || 0}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Ad Accounts</div>
              <div className="text-2xl font-bold">{status.accounts_count || 0}</div>
            </div>
          </div>

          {status.last_sync_at && (
            <div className="text-xs text-gray-500">
              Last synced: {new Date(status.last_sync_at).toLocaleString()}
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              onClick={handleSyncData} 
              disabled={isSyncing}
              variant="outline"
            >
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </Button>
            
            <Button 
              onClick={handleDisconnect} 
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}