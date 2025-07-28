'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FixUserPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/debug/fix-user-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fix user')
      }

      setResult(data)
      
      // Redirect to leads page after 3 seconds
      setTimeout(() => {
        router.push('/leads')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-4">Fix User Organization</h1>
        
        <p className="text-gray-300 mb-6">
          Your user account needs to be linked to the Atlas Fitness organization. 
          Click the button below to fix this issue.
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 mb-4">
            <p className="text-green-200 font-semibold">{result.message}</p>
            <p className="text-green-300 text-sm mt-2">Redirecting to leads page...</p>
          </div>
        )}

        <button
          onClick={handleFix}
          disabled={loading || result}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Fixing...' : result ? 'Fixed!' : 'Fix User Organization'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300 font-mono">
              User ID: {result.user?.id}
            </p>
            <p className="text-sm text-gray-300 font-mono">
              Organization: {result.user?.organization_id}
            </p>
            <p className="text-sm text-gray-300 font-mono">
              Role: {result.user?.role}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}