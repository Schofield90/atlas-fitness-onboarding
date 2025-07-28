'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DirectFixPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/debug/direct-db-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'sam@atlas-gyms.co.uk'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fix user')
      }

      setResult(data)
      
      // Redirect to leads page after 3 seconds
      if (data.success) {
        setTimeout(() => {
          router.push('/leads')
        }, 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-white mb-4">Direct Database Fix</h1>
        
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
          <p className="text-yellow-200">
            This will directly create your user entry in the database using admin privileges.
          </p>
          <p className="text-yellow-300 text-sm mt-2">
            Email: sam@atlas-gyms.co.uk
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 mb-4">
            <p className="text-green-200 font-semibold">
              {result.success ? 'Successfully fixed!' : 'Fix attempted'}
            </p>
            {result.success && (
              <p className="text-green-300 text-sm mt-2">Redirecting to leads page...</p>
            )}
          </div>
        )}

        <button
          onClick={handleFix}
          disabled={loading || (result && result.success)}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Running Fix...' : result?.success ? 'Fixed!' : 'Run Direct Database Fix'}
        </button>

        {result && (
          <div className="mt-6 space-y-4">
            {result.authUser && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Auth User</h3>
                <p className="text-sm text-gray-400 font-mono">ID: {result.authUser.id}</p>
                <p className="text-sm text-gray-400 font-mono">Email: {result.authUser.email}</p>
              </div>
            )}
            
            {result.newUser && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Created User</h3>
                <p className="text-sm text-gray-400 font-mono">Organization: {result.organization?.name}</p>
                <p className="text-sm text-gray-400 font-mono">Role: {result.newUser.role}</p>
              </div>
            )}
            
            {result.testLead && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Test Lead Creation</h3>
                <p className="text-sm text-gray-400">
                  {result.testLead.created 
                    ? '✓ Successfully created test lead' 
                    : `✗ Failed: ${result.testLead.error}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}