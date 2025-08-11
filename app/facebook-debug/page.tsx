'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'

export default function FacebookDebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runDebugTest = async () => {
    setLoading(true)
    setError('')
    setDebugData(null)

    try {
      const response = await fetch('/api/debug/facebook-sync-test')
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Debug test failed')
      }
      
      setDebugData(data)
    } catch (err) {
      setError('Failed to run debug test')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const syncPages = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/meta/sync-pages', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Sync failed')
      } else {
        alert(`Success: ${data.message || 'Pages synced'}`)
        // Re-run debug to see updated state
        await runDebugTest()
      }
    } catch (err) {
      setError('Failed to sync pages')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Facebook Integration Debug</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={runDebugTest}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded"
            >
              {loading ? 'Running...' : 'Run Debug Test'}
            </button>
            
            <button
              onClick={syncPages}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded"
            >
              {loading ? 'Syncing...' : 'Sync Pages from Facebook'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-600 rounded p-4 mb-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {debugData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-900 rounded p-4">
                <h3 className="font-bold mb-2">Summary</h3>
                <p className={`text-${debugData.success ? 'green' : 'red'}-400`}>
                  Status: {debugData.success ? 'Ready to sync' : 'Issues detected'}
                </p>
              </div>

              {/* Integration Status */}
              {debugData.integration && (
                <div className="bg-gray-900 rounded p-4">
                  <h3 className="font-bold mb-2">Facebook Integration</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ Integration exists</li>
                    <li>{debugData.integration.has_token ? '✓' : '✗'} Has access token</li>
                    <li>Token length: {debugData.integration.token_length}</li>
                    <li>Created: {new Date(debugData.integration.created_at).toLocaleDateString()}</li>
                    <li>Last sync: {debugData.integration.last_sync || 'Never'}</li>
                  </ul>
                </div>
              )}

              {/* API Result */}
              {debugData.api_result && (
                <div className="bg-gray-900 rounded p-4">
                  <h3 className="font-bold mb-2">Facebook API Result</h3>
                  {debugData.api_result.error ? (
                    <div className="text-red-400">
                      <p>Error: {debugData.api_result.error.message}</p>
                      <p className="text-sm">Code: {debugData.api_result.error.code}</p>
                      <p className="text-sm">Type: {debugData.api_result.error.type}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-green-400">✓ Found {debugData.api_result.pages_count} pages</p>
                      {debugData.api_result.pages.map((page: any) => (
                        <div key={page.id} className="ml-4 mt-2 text-sm">
                          <p>• {page.name} ({page.id})</p>
                          <p className="text-gray-400 ml-4">Access token: {page.access_token}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Database Status */}
              {debugData.database && (
                <div className="bg-gray-900 rounded p-4">
                  <h3 className="font-bold mb-2">Database Status</h3>
                  <p>Pages in database: {debugData.database.pages_count}</p>
                  {debugData.database.pages.map((page: any) => (
                    <div key={page.id} className="ml-4 mt-2 text-sm">
                      <p>• {page.page_name} ({page.facebook_page_id})</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {debugData.suggestions && debugData.suggestions.length > 0 && (
                <div className="bg-yellow-900 border border-yellow-600 rounded p-4">
                  <h3 className="font-bold mb-2 text-yellow-200">Suggestions</h3>
                  <ul className="text-yellow-300 text-sm space-y-1">
                    {debugData.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Data */}
              <details className="bg-gray-900 rounded p-4">
                <summary className="cursor-pointer font-bold">Raw Debug Data</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}