'use client'

import { useState, useEffect } from 'react'

interface FacebookConnectionStatus {
  connected: boolean
  connectedAt: string | null
  loading: boolean
  error: string | null
  debug: {
    storageMethod: string
    lastChecked: string
    rawValue: string | null
  }
}

export function useFacebookConnection(): FacebookConnectionStatus & {
  disconnect: () => void
  refresh: () => void
} {
  const [status, setStatus] = useState<FacebookConnectionStatus>({
    connected: false,
    connectedAt: null,
    loading: true,
    error: null,
    debug: {
      storageMethod: 'localStorage',
      lastChecked: '',
      rawValue: null
    }
  })

  const checkConnection = async () => {
    try {
      console.log('🔍 Checking Facebook connection status...')
      
      // Server is the single source of truth
      const response = await fetch('/api/integrations/facebook/status')
      
      if (response.ok) {
        const serverStatus = await response.json()
        
        console.log('📡 Server status:', serverStatus)

        // Update localStorage to match server state
        if (serverStatus.connected && serverStatus.integration) {
          localStorage.setItem('facebook_connected', 'true')
          localStorage.setItem('facebook_connected_at', serverStatus.integration.connected_at || '')
          localStorage.setItem('facebook_user_name', serverStatus.integration.facebook_user_name || '')
          localStorage.setItem('facebook_user_id', serverStatus.integration.facebook_user_id || '')
        } else {
          // Clear localStorage if not connected
          localStorage.removeItem('facebook_connected')
          localStorage.removeItem('facebook_connected_at')
          localStorage.removeItem('facebook_user_name')
          localStorage.removeItem('facebook_user_id')
        }

        // Update state with server response
        setStatus({
          connected: serverStatus.connected,
          connectedAt: serverStatus.integration?.connected_at || null,
          loading: false,
          error: serverStatus.error || null,
          debug: {
            storageMethod: 'server (source of truth)',
            lastChecked: new Date().toISOString(),
            rawValue: localStorage.getItem('facebook_connected'),
            serverResponse: serverStatus
          }
        })
      } else {
        // Server error - show error state
        console.error('❌ Failed to check server status:', response.status)
          console.warn('⚠️ Server status check failed, using localStorage only')
          setStatus(prev => ({
            ...prev,
            loading: false,
            error: `Server check failed: ${response.status}`
          }))
        }
      } catch (serverError) {
        // Network error - fall back to localStorage only  
        console.warn('⚠️ Server status check failed, using localStorage only:', serverError)
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: `Server unreachable: ${serverError instanceof Error ? serverError.message : 'Unknown error'}`
        }))
      }
    } catch (error) {
      console.error('❌ Error checking Facebook connection:', error)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  const disconnect = async () => {
    try {
      console.log('🔌 Disconnecting Facebook integration')
      
      // Call API to clear server-side data
      const response = await fetch('/api/integrations/facebook/disconnect', {
        method: 'POST'
      })
      
      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem('facebook_connected')
        localStorage.removeItem('facebook_connected_at')
        localStorage.removeItem('facebook_user_id')
        localStorage.removeItem('facebook_user_name')
        
        // Dispatch storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'facebook_connected',
          newValue: null,
          oldValue: 'true'
        }))
        
        console.log('✅ Facebook integration disconnected successfully')
      } else {
        const error = await response.json()
        console.error('❌ Server error disconnecting:', error)
        throw new Error(error.error || 'Failed to disconnect')
      }
      
      // Refresh status from server
      checkConnection()
    } catch (error) {
      console.error('❌ Error disconnecting Facebook:', error)
      // Still try to clear localStorage even if server call fails
      localStorage.removeItem('facebook_connected')
      localStorage.removeItem('facebook_connected_at')
      localStorage.removeItem('facebook_user_id')
      localStorage.removeItem('facebook_user_name')
      checkConnection()
    }
  }

  const refresh = () => {
    console.log('🔄 Refreshing Facebook connection status')
    checkConnection()
  }

  useEffect(() => {
    checkConnection()

    // Listen for localStorage changes (in case user connects in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'facebook_connected' || e.key === 'facebook_connected_at') {
        console.log('📱 localStorage change detected:', e.key, e.newValue)
        checkConnection()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    ...status,
    disconnect,
    refresh
  }
}