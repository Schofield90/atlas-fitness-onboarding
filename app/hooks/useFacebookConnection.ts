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

  const checkConnection = () => {
    try {
      const connected = localStorage.getItem('facebook_connected')
      const connectedAt = localStorage.getItem('facebook_connected_at')
      
      console.log('🔍 Facebook Connection Check:', {
        connected,
        connectedAt,
        timestamp: new Date().toISOString()
      })

      setStatus({
        connected: connected === 'true',
        connectedAt,
        loading: false,
        error: null,
        debug: {
          storageMethod: 'localStorage (demo)',
          lastChecked: new Date().toISOString(),
          rawValue: connected
        }
      })
    } catch (error) {
      console.error('❌ Error checking Facebook connection:', error)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  const disconnect = () => {
    try {
      console.log('🔌 Disconnecting Facebook integration')
      localStorage.removeItem('facebook_connected')
      localStorage.removeItem('facebook_connected_at')
      checkConnection() // Refresh status
    } catch (error) {
      console.error('❌ Error disconnecting Facebook:', error)
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