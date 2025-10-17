'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Loader } from 'lucide-react'

export default function FacebookDiagnosticPanel() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [tokenTest, setTokenTest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [setupResult, setSetupResult] = useState<any>(null)
  const [fixResult, setFixResult] = useState<any>(null)

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

  const forceSetup = async () => {
    setLoading(true)
    setSetupResult(null)
    
    try {
      const setupRes = await fetch('/api/facebook/force-setup', {
        method: 'POST'
      })
      
      const setupData = await setupRes.json()
      setSetupResult(setupData)
      
      if (setupData.success) {
        // Re-run diagnostics after setup
        setTimeout(() => runDiagnostics(), 2000)
      }
    } catch (error) {
      console.error('Setup error:', error)
      setSetupResult({ error: 'Failed to setup integration' })
    } finally {
      setLoading(false)
    }
  }

  const fixConnection = async () => {
    setLoading(true)
    setFixResult(null)
    
    try {
      // First, clear the broken connection
      const fixRes = await fetch('/api/integrations/meta/fix-connection', {
        method: 'POST'
      })
      
      const fixData = await fixRes.json()
      setFixResult(fixData)
      
      if (fixData.success) {
        // Clear local storage
        localStorage.removeItem('fb_connected')
        localStorage.removeItem('fb_pages_synced')
        localStorage.removeItem('fb_integration_status')
        
        // Re-run diagnostics after fix
        setTimeout(() => runDiagnostics(), 2000)
      }
    } catch (error) {
      console.error('Fix error:', error)
      setFixResult({ error: 'Failed to fix connection' })
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
              
              {/* Fix Connection Button - Show when integration is broken */}
              <button
                onClick={fixConnection}
                disabled={loading}
                className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Fixing Connection...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Fix Database & Reconnect
                  </>
                )}
              </button>
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

      {/* Fix Result */}
      {fixResult && (
        <div className={`rounded p-3 ${fixResult.error ? 'bg-red-900/30 border border-red-600' : 'bg-green-900/30 border border-green-600'}`}>
          {fixResult.error ? (
            <div className="text-red-400">
              <div className="font-medium mb-1">Fix Failed:</div>
              <div className="text-sm">{fixResult.error}</div>
            </div>
          ) : (
            <div className="text-green-400">
              <div className="font-medium mb-1">Connection Reset Successfully!</div>
              <div className="text-sm">{fixResult.message}</div>
              {fixResult.actions && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-400 mb-1">Actions completed:</div>
                  {fixResult.actions.map((action: string, idx: number) => (
                    <div key={idx} className="text-gray-300">✓ {action}</div>
                  ))}
                </div>
              )}
              <div className="mt-3 text-yellow-400 text-sm">
                Please reconnect your Facebook account now.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup Result */}
      {setupResult && (
        <div className={`rounded p-3 ${setupResult.error ? 'bg-red-900/30 border border-red-600' : 'bg-green-900/30 border border-green-600'}`}>
          {setupResult.error ? (
            <div className="text-red-400">
              <div className="font-medium mb-1">Setup Failed:</div>
              <div className="text-sm">{setupResult.error}</div>
              {setupResult.solution && (
                <div className="text-yellow-400 text-sm mt-2">
                  Solution: {setupResult.solution}
                </div>
              )}
              {setupResult.migration && (
                <div className="text-blue-400 text-xs mt-2">
                  Run this migration: {setupResult.migration}
                </div>
              )}
            </div>
          ) : (
            <div className="text-green-400">
              <div className="font-medium mb-1">Setup Successful!</div>
              <div className="text-sm">{setupResult.message}</div>
              {setupResult.next_steps && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-400 mb-1">Next steps:</div>
                  {setupResult.next_steps.map((step: string, idx: number) => (
                    <div key={idx} className="text-gray-300">{step}</div>
                  ))}
                </div>
              )}
            </div>
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