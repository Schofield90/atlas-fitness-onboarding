'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NuclearCleanPage() {
  const [status, setStatus] = useState('Initializing...')
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState<any>({})
  const [cleaning, setCleaning] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  useEffect(() => {
    checkCurrentState()
  }, [])

  const checkCurrentState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('Not authenticated')
        return
      }

      // Get all organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')

      // Count classes for each org
      const counts: any = {}
      for (const org of orgs || []) {
        const { count } = await supabase
          .from('class_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        counts[org.id] = {
          name: org.name,
          count: count || 0
        }
      }

      // Also check for orphaned classes
      const { count: totalClasses } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })

      setStats({
        organizations: counts,
        totalClasses: totalClasses || 0,
        user: user.email
      })

      setStatus('Ready to clean')
    } catch (error) {
      addLog(`Error checking state: ${error}`)
      setStatus('Error')
    }
  }

  const nuclearClean = async () => {
    if (!confirm('⚠️ NUCLEAR OPTION ⚠️\n\nThis will DELETE:\n- ALL class sessions\n- ALL programs\n- ALL bookings\n- Clear ALL caches\n\nAre you absolutely sure?')) {
      return
    }

    if (!confirm('FINAL WARNING: This cannot be undone. Type "DELETE ALL" to confirm.')) {
      return
    }

    setCleaning(true)
    setStatus('Nuclear cleaning in progress...')

    try {
      // 1. Delete all bookings first (foreign key constraint)
      addLog('Deleting all bookings...')
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (bookingError) {
        addLog(`Warning: Booking deletion error: ${bookingError.message}`)
      } else {
        addLog('✅ All bookings deleted')
      }

      // 2. Delete all class sessions
      addLog('Deleting all class sessions...')
      const { error: sessionError } = await supabase
        .from('class_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (sessionError) {
        addLog(`Warning: Session deletion error: ${sessionError.message}`)
      } else {
        addLog('✅ All class sessions deleted')
      }

      // 3. Delete all programs
      addLog('Deleting all programs...')
      const { error: programError } = await supabase
        .from('programs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (programError) {
        addLog(`Warning: Program deletion error: ${programError.message}`)
      } else {
        addLog('✅ All programs deleted')
      }

      // 4. Clear all browser storage
      addLog('Clearing browser storage...')
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
            addLog(`Deleted IndexedDB: ${db.name}`)
          }
        }
      }

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          await caches.delete(name)
          addLog(`Deleted cache: ${name}`)
        }
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
          addLog('Unregistered service worker')
        }
      }

      // 5. Final verification
      addLog('Verifying cleanup...')
      const { count: remainingClasses } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })

      const { count: remainingPrograms } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })

      const { count: remainingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      addLog(`Remaining classes: ${remainingClasses || 0}`)
      addLog(`Remaining programs: ${remainingPrograms || 0}`)
      addLog(`Remaining bookings: ${remainingBookings || 0}`)

      setStatus('✅ Nuclear clean complete!')
      addLog('✅ NUCLEAR CLEAN COMPLETE')

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/classes')
      }, 3000)

    } catch (error) {
      addLog(`Fatal error: ${error}`)
      setStatus('❌ Error during nuclear clean')
    } finally {
      setCleaning(false)
    }
  }

  const quickClean = async () => {
    setCleaning(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (userOrg) {
        addLog(`Deleting classes for organization: ${userOrg.organization_id}`)
        const { error } = await supabase
          .from('class_sessions')
          .delete()
          .eq('organization_id', userOrg.organization_id)

        if (!error) {
          addLog('✅ Classes deleted for your organization')
          checkCurrentState()
        }
      }
    } catch (error) {
      addLog(`Error: ${error}`)
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          <h1 className="text-3xl font-bold text-red-500 mb-2">🔥 Nuclear Clean Utility</h1>
          <p className="text-gray-400 mb-6">Last resort for clearing phantom classes</p>

          <div className="mb-6 p-4 bg-gray-700 rounded">
            <h2 className="text-lg font-semibold text-white mb-2">Current State:</h2>
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </div>

          <div className="space-y-4 mb-6">
            <button
              onClick={quickClean}
              disabled={cleaning}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {cleaning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Cleaning...
                </>
              ) : (
                <>
                  🧹 Quick Clean (Your Org Only)
                </>
              )}
            </button>

            <button
              onClick={nuclearClean}
              disabled={cleaning}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {cleaning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Cleaning...
                </>
              ) : (
                <>
                  ☢️ NUCLEAR CLEAN (Delete Everything)
                </>
              )}
            </button>

            <button
              onClick={() => router.push('/classes')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Go to Classes
            </button>
          </div>

          <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Operation Log:</h3>
            <div className="space-y-1 text-xs font-mono text-gray-500">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-yellow-400">{status}</p>
          </div>
        </div>
      </div>
    </div>
  )
}