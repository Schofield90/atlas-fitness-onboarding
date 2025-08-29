'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function SQLCheckPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const runQuery = async (query: string, description: string) => {
    setLoading(true)
    try {
      // SECURITY: Disabled direct SQL execution - this is a critical vulnerability
      // This page should not exist in production
      return { 
        description, 
        error: 'SQL execution is disabled for security reasons',
        data: null,
        count: 0
      }
    } catch (err) {
      return { description, error: err }
    }
  }

  const checkDatabase = async () => {
    setLoading(true)
    const queries = []

    try {
      // Direct count query
      const { count: totalCount, error: countError } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })

      queries.push({
        description: 'Total class_sessions count',
        count: totalCount,
        error: countError
      })

      // Get sample of class IDs
      const { data: sampleClasses, error: sampleError } = await supabase
        .from('class_sessions')
        .select('id, name, organization_id, created_at')
        .limit(10)
        .order('created_at', { ascending: false })

      queries.push({
        description: 'Sample of latest classes',
        data: sampleClasses,
        error: sampleError
      })

      // Count by organization
      const { data: orgCounts, error: orgError } = await supabase
        .from('class_sessions')
        .select('organization_id')
        .order('organization_id')

      // Group by organization manually
      const orgGrouped: any = {}
      if (orgCounts) {
        orgCounts.forEach((row: any) => {
          const orgId = row.organization_id
          orgGrouped[orgId] = (orgGrouped[orgId] || 0) + 1
        })
      }

      queries.push({
        description: 'Classes per organization',
        data: orgGrouped,
        error: orgError
      })

      // Check if there are any classes with your user's org
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()

        if (userOrg) {
          const { count: userOrgCount } = await supabase
            .from('class_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', userOrg.organization_id)

          queries.push({
            description: `Classes for your org (${userOrg.organization_id})`,
            count: userOrgCount
          })
        }
      }

      setResults({ queries, timestamp: new Date().toISOString() })
    } catch (error) {
      setResults({ error: error })
    } finally {
      setLoading(false)
    }
  }

  const deleteAllClasses = async () => {
    if (!confirm('Delete ALL classes from the database?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/debug/force-delete-classes', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Success!\n\n${result.message}\n\nDetails:\n- Bookings deleted: ${result.details.bookingsDeleted}\n- Classes deleted: ${result.details.classesDeleted}\n- Classes remaining: ${result.details.classesRemaining}`)
        checkDatabase()
      } else {
        alert(`Error: ${result.error}\n\nDetails: ${result.details}`)
      }
    } catch (error) {
      alert(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const clearBrowserData = () => {
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }

    // Force reload
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">SQL Database Check</h1>

        <div className="space-y-4 mb-8">
          <button
            onClick={checkDatabase}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg mr-4"
          >
            {loading ? 'Checking...' : 'Check Database'}
          </button>

          <button
            onClick={deleteAllClasses}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg mr-4"
          >
            Delete ALL Classes (SQL)
          </button>

          <button
            onClick={clearBrowserData}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg"
          >
            Clear Browser & Reload
          </button>
        </div>

        {results && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Results:</h2>
            <pre className="text-gray-300 text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-yellow-900/50 border border-yellow-700 rounded-lg p-6">
          <h3 className="text-yellow-400 font-semibold mb-2">Debugging Steps:</h3>
          <ol className="list-decimal list-inside text-yellow-300 space-y-2">
            <li>Click "Check Database" to see actual database state</li>
            <li>If classes exist in DB, click "Delete ALL Classes"</li>
            <li>Click "Clear Browser & Reload" to clear all caches</li>
            <li>Go back to /classes page</li>
            <li>If classes still appear, they are being generated client-side</li>
          </ol>
        </div>
      </div>
    </div>
  )
}