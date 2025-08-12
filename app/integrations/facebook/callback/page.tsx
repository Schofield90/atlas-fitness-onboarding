'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const success = searchParams.get('success')
    const userId = searchParams.get('user_id')
    const userName = searchParams.get('user_name')
    const state = searchParams.get('state')

    if (error) {
      setStatus('error')
      setMessage(`Facebook OAuth error: ${errorDescription || error}`)
      return
    }

    if (success === 'true') {
      // Store connection status and user info in localStorage
      const connectionTime = new Date().toISOString()
      localStorage.setItem('facebook_connected', 'true')
      localStorage.setItem('facebook_connected_at', connectionTime)
      localStorage.setItem('facebook_user_id', userId || '')
      localStorage.setItem('facebook_user_name', userName || '')
      
      console.log('✅ Facebook connection successful:', {
        connected: true,
        connectedAt: connectionTime,
        userId: userId,
        userName: userName
      })
      
      setStatus('success')
      setMessage(`Successfully connected to Facebook as ${userName}!`)
      
      // Trigger a storage event to notify other tabs/components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'facebook_connected',
        newValue: 'true',
        oldValue: null
      }))
      
      // Sync Facebook pages and ad accounts
      syncFacebookData()
      
      // Redirect to Facebook integrations page after sync completes
      // Will be handled in syncFacebookData function
    } else {
      setStatus('error')
      setMessage('OAuth callback completed but no success confirmation received')
    }
  }, [searchParams, router])

  const syncFacebookData = async () => {
    setIsSyncing(true)
    setSyncMessage('Syncing Facebook pages...')
    
    try {
      // First sync pages
      const pagesResponse = await fetch('/api/integrations/meta/sync-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const pagesData = await pagesResponse.json()
      
      if (pagesResponse.ok) {
        const pageCount = pagesData.summary?.successful || 0
        setSyncMessage(`Synced ${pageCount} pages. Now syncing ad accounts...`)
        
        // Then sync ad accounts
        const adAccountsResponse = await fetch('/api/integrations/meta/sync-ad-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const adAccountsData = await adAccountsResponse.json()
        
        if (adAccountsResponse.ok) {
          const adAccountCount = adAccountsData.summary?.successful || 0
          setSyncMessage(`Successfully synced ${pageCount} pages and ${adAccountCount} ad accounts!`)
        } else {
          console.error('Failed to sync ad accounts:', adAccountsData)
          setSyncMessage(`Synced ${pageCount} pages. Ad accounts sync failed.`)
        }
      } else {
        console.error('Failed to sync pages:', pagesData)
        setSyncMessage(`Sync failed: ${pagesData.error || pagesData.details || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error syncing Facebook data:', error)
      setSyncMessage('Failed to sync Facebook data')
    } finally {
      setIsSyncing(false)
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/integrations/facebook')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full text-center p-6">
        <Link href="/" className="text-2xl font-bold text-orange-500 mb-8 block">
          Atlas Fitness
        </Link>

        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Connecting to Facebook...</h2>
            <p className="text-gray-300">Please wait while we set up your integration.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✓</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-green-400">Connection Successful!</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            
            {isSyncing && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-blue-400 text-sm">{syncMessage}</p>
              </div>
            )}
            
            {!isSyncing && syncMessage && (
              <div className="mt-4">
                <p className="text-blue-400 text-sm mb-2">{syncMessage}</p>
                <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
              </div>
            )}
            
            {!isSyncing && !syncMessage && (
              <p className="text-gray-400 text-sm">Preparing to sync your Facebook data...</p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✗</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-red-400">Connection Failed</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="space-y-3">
              <Link 
                href="/integrations/facebook"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors block"
              >
                Try Again
              </Link>
              <Link 
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors block"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}