'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

export default function ForceRefreshPage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState('Starting refresh...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message])
  }

  useEffect(() => {
    const clearAllCaches = async () => {
      try {
        // 1. Clear localStorage
        addLog('Clearing localStorage...')
        localStorage.clear()
        
        // 2. Clear sessionStorage
        addLog('Clearing sessionStorage...')
        sessionStorage.clear()
        
        // 3. Clear IndexedDB (if any)
        addLog('Clearing IndexedDB...')
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases()
          for (const db of databases) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
              addLog(`Deleted IndexedDB: ${db.name}`)
            }
          }
        }
        
        // 4. Clear service worker caches
        addLog('Clearing service worker caches...')
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(name => {
              addLog(`Deleting cache: ${name}`)
              return caches.delete(name)
            })
          )
        }
        
        // 5. Unregister service workers
        addLog('Unregistering service workers...')
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
            addLog('Unregistered service worker')
          }
        }
        
        // 6. Clear Next.js router cache
        addLog('Clearing Next.js router cache...')
        router.refresh()
        
        // 7. Check current class count
        addLog('Checking current class count...')
        const { data: classes, error } = await supabase
          .from('class_sessions')
          .select('id', { count: 'exact', head: true })
        
        if (error) {
          addLog(`Error checking classes: ${error.message}`)
        } else {
          addLog(`Current class count in database: ${classes?.length || 0}`)
        }
        
        // 8. Force reload after a delay
        setStatus('Cache cleared! Reloading in 3 seconds...')
        addLog('All caches cleared successfully!')
        
        setTimeout(() => {
          // Force hard reload
          window.location.href = '/classes'
        }, 3000)
        
      } catch (error) {
        console.error('Error clearing caches:', error)
        setStatus('Error clearing caches')
        addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    clearAllCaches()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Force Refresh - Clear All Caches</h1>
          
          <div className="mb-6">
            <p className="text-lg font-semibold text-blue-600">{status}</p>
          </div>
          
          <div className="bg-gray-100 rounded p-4">
            <h2 className="font-semibold mb-2">Operations Log:</h2>
            <div className="space-y-1 text-sm font-mono">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>This page will:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Clear all browser storage (localStorage, sessionStorage, IndexedDB)</li>
              <li>Clear all service worker caches</li>
              <li>Unregister service workers</li>
              <li>Force refresh Next.js router cache</li>
              <li>Check current database class count</li>
              <li>Redirect to classes page with fresh data</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Run Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}