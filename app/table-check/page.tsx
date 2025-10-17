'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TableCheck {
  table: string
  exists: boolean
  error?: string
  rowCount?: number
}

export default function TableCheckPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TableCheck[]>([])
  const supabase = createClient()

  const tablesToCheck = [
    'memberships',
    'notifications', 
    'tasks',
    'workflow_events',
    'client_activities',
    'lead_stage_history',
    'membership_plans',
    'bookings',
    'class_sessions',
    'programs',
    'waitlist',
    'profiles',
    'users',
    'organization_members',
    'discount_codes',
    'locations',
    'organizations',
    'organization_staff'
  ]

  const checkTables = async () => {
    setLoading(true)
    const checks: TableCheck[] = []

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        checks.push({
          table,
          exists: !error,
          error: error?.message,
          rowCount: count || 0
        })
      } catch (e: any) {
        checks.push({
          table,
          exists: false,
          error: e.message || 'Table does not exist'
        })
      }
    }

    setResults(checks.sort((a, b) => {
      // Sort missing tables first
      if (a.exists !== b.exists) return a.exists ? 1 : -1
      return a.table.localeCompare(b.table)
    }))
    setLoading(false)
  }

  const missingTables = results.filter(r => !r.exists)
  const existingTables = results.filter(r => r.exists)

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Database Table Check</h1>
        
        <button
          onClick={checkTables}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg mb-8"
        >
          {loading ? 'Checking...' : 'Check Tables'}
        </button>

        {results.length > 0 && (
          <>
            <div className="mb-8 bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-2">Summary</h2>
              <p className="text-gray-300">
                Total tables checked: {results.length}<br />
                Existing tables: {existingTables.length}<br />
                Missing tables: {missingTables.length}
              </p>
            </div>

            {missingTables.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-red-500 mb-4">Missing Tables ({missingTables.length})</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {missingTables.map((check) => (
                    <div key={check.table} className="p-4 border-b border-gray-700 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{check.table}</span>
                        <span className="text-red-500 text-sm">{check.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingTables.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-green-500 mb-4">Existing Tables ({existingTables.length})</h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {existingTables.map((check) => (
                    <div key={check.table} className="p-4 border-b border-gray-700 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{check.table}</span>
                        <span className="text-gray-400 text-sm">{check.rowCount} rows</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}