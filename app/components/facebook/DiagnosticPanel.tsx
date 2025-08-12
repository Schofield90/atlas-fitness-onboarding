'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Loader } from 'lucide-react'

export default function FacebookDiagnosticPanel() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [tokenTest, setTokenTest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setSyncResult(null)
    
    try {
      // Run diagnostic
      const diagRes = await fetch('/api/facebook/diagnostic')
      const diagData = await diagRes.json()
      setDiagnostics(diagData)
      
      // Test token
      const tokenRes = await fetch('/api/facebook/test-token')
      const tokenData = await tokenRes.json()
      setTokenTest(tokenData)
    } catch (error) {
      console.error('Diagnostic error:', error)
      setDiagnostics({ error: 'Failed to run diagnostics' })
    } finally {
      setLoading(false)
    }
  }

  const syncPages = async () => {
    setLoading(true)
    setSyncResult(null)
    
    try {
      const syncRes = await fetch('/api/integrations/meta/sync-pages-fix', {
        method: 'POST'
      })
      
      const syncData = await syncRes.json()
      setSyncResult(syncData)
      
      // Re-run diagnostics after sync
      await runDiagnostics()
    } catch (error) {
      console.error('Sync error:', error)
      setSyncResult({ error: 'Failed to sync pages' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Facebook Integration Diagnostic</h3>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Run Diagnostic
        </button>
      </div>

      {diagnostics && (
        <div className="space-y-3">
          {/* User Info */}
          <div className="bg-gray-700 rounded p-3">
            <div className="text-sm text-gray-400">Logged in as:</div>
            <div className="text-white">{diagnostics.user?.email}</div>
          </div>

          {/* Integration Status */}
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              {diagnostics.facebook_integration?.active ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-white">Facebook Integration</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="text-gray-400">
                Status: {diagnostics.facebook_integration?.active ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-red-400">Not Active</span>
                )}
              </div>
              {diagnostics.facebook_integration?.needs_fix && (
                <div className="text-yellow-400">⚠️ Organization ID needs fixing</div>
              )}
            </div>
          </div>

          {/* Token Test */}
          {tokenTest && (
            <div className="bg-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                {tokenTest.tokenValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium text-white">Facebook Token</span>
              </div>
              {tokenTest.tokenValid ? (
                <div className="text-sm space-y-1">
                  <div className="text-gray-400">Connected as: {tokenTest.user?.name}</div>
                  <div className="text-gray-400">Pages found: {tokenTest.pages?.count || 0}</div>
                  {tokenTest.pages?.list && tokenTest.pages.list.length > 0 && (
                    <div className="mt-2">
                      <div className="text-gray-400 mb-1">Available pages:</div>
                      {tokenTest.pages.list.map((page: any) => (
                        <div key={page.id} className="text-green-400 text-xs">
                          • {page.name} ({page.category})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-400">
                  {tokenTest.error || 'Token is not valid'}
                </div>
              )}
            </div>
          )}

          {/* Pages Status */}
          <div className="bg-gray-700 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              {diagnostics.facebook_pages?.count > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="font-medium text-white">Synced Pages</span>
            </div>
            <div className="text-sm text-gray-400">
              {diagnostics.facebook_pages?.count || 0} pages in database
            </div>
            {diagnostics.facebook_pages?.pages && diagnostics.facebook_pages.pages.length > 0 && (
              <div className="mt-2">
                {diagnostics.facebook_pages.pages.map((page: any) => (
                  <div key={page.id} className="text-green-400 text-xs">
                    • {page.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3">
              <div className="text-yellow-400 font-medium mb-2">Recommendations:</div>
              <ul className="text-sm text-yellow-300 space-y-1">
                {diagnostics.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestion from token test */}
          {tokenTest?.suggestion && (
            <div className="bg-blue-900/30 border border-blue-600 rounded p-3">
              <div className="text-blue-400 font-medium mb-1">Action Required:</div>
              <div className="text-sm text-blue-300">{tokenTest.suggestion}</div>
            </div>
          )}

          {/* Sync Button */}
          {tokenTest?.tokenValid && tokenTest?.pages?.count > 0 && diagnostics?.facebook_pages?.count === 0 && (
            <button
              onClick={syncPages}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Syncing Pages...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync {tokenTest.pages.count} Pages to Database
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`rounded p-3 ${syncResult.error ? 'bg-red-900/30 border border-red-600' : 'bg-green-900/30 border border-green-600'}`}>
          {syncResult.error ? (
            <div className="text-red-400">
              <div className="font-medium mb-1">Sync Failed:</div>
              <div className="text-sm">{syncResult.error}</div>
              {syncResult.details && (
                <div className="text-xs mt-2 text-red-300">{JSON.stringify(syncResult.details)}</div>
              )}
            </div>
          ) : (
            <div className="text-green-400">
              <div className="font-medium mb-1">Sync Successful!</div>
              <div className="text-sm">{syncResult.message}</div>
              {syncResult.summary && (
                <div className="text-xs mt-2">
                  Synced {syncResult.summary.successful} pages successfully
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}