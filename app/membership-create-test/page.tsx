'use client'

import { useState } from 'react'
import { createAdminClient } from '@/app/lib/supabase/admin'

export default function MembershipCreateTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createTestMembership = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/create-test-membership')
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const checkMemberships = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/check-all-memberships')
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Membership Plan Test</h1>
        
        <div className="space-x-4 mb-8">
          <button
            onClick={createTestMembership}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg"
          >
            {loading ? 'Loading...' : 'Create Test Membership Plan'}
          </button>
          
          <button
            onClick={checkMemberships}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg"
          >
            {loading ? 'Loading...' : 'Check All Memberships'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <pre className="text-white whitespace-pre-wrap overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}