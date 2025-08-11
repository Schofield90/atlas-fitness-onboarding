'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'

export default function FixOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const fixOrganization = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/debug/fix-organization')
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to fix organization')
        setResult(data)
      } else {
        setResult(data)
        
        if (data.status === 'fixed' || data.status === 'created') {
          setTimeout(() => {
            router.push('/integrations/facebook')
          }, 2000)
        }
      }
    } catch (err) {
      setError('Failed to fix organization')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Fix Organization Association</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-300 mb-6">
            If you're seeing "No organization found" errors, click the button below to fix your organization association.
          </p>

          <button
            onClick={fixOrganization}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium"
          >
            {loading ? 'Fixing...' : 'Fix Organization'}
          </button>

          {error && (
            <div className="mt-6 bg-red-900 border border-red-600 rounded p-4">
              <p className="text-red-300">{error}</p>
              {result?.details && (
                <pre className="mt-2 text-xs text-red-400 overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          {result && !error && (
            <div className="mt-6 space-y-4">
              <div className={`rounded p-4 ${
                result.status === 'ok' ? 'bg-blue-900 border border-blue-600' :
                result.status === 'fixed' ? 'bg-green-900 border border-green-600' :
                result.status === 'created' ? 'bg-green-900 border border-green-600' :
                'bg-gray-900 border border-gray-600'
              }`}>
                <p className={`font-medium ${
                  result.status === 'ok' ? 'text-blue-300' :
                  result.status === 'fixed' || result.status === 'created' ? 'text-green-300' :
                  'text-gray-300'
                }`}>
                  {result.message}
                </p>
              </div>

              <div className="bg-gray-900 rounded p-4">
                <h3 className="font-medium mb-2">Details:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>User ID: {result.user_id}</li>
                  <li>Organization ID: {result.organization_id}</li>
                  {result.organization_name && (
                    <li>Organization Name: {result.organization_name}</li>
                  )}
                  {result.role && (
                    <li>Role: {result.role}</li>
                  )}
                </ul>
              </div>

              {(result.status === 'fixed' || result.status === 'created') && (
                <div className="bg-green-900 border border-green-600 rounded p-4">
                  <p className="text-green-300">
                    ✓ Organization fixed! Redirecting to Facebook integration page...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}