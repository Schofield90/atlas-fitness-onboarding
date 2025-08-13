'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, RefreshCw, Settings, Database, Key } from 'lucide-react'

export default function PublicFacebookDebugPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<any>(null)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      // Check environment and basic setup
      const response = await fetch('/api/integrations/facebook/public-test')
      const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Diagnostic error:', error)
      setDiagnostics({ error: 'Failed to run diagnostics' })
    } finally {
      setLoading(false)
    }
  }

  const validateTokenPublic = async () => {
    setValidating(true)
    setTokenStatus(null)
    try {
      const response = await fetch('/api/integrations/facebook/public-validate', {
        method: 'POST'
      })
      const data = await response.json()
      setTokenStatus(data)
    } catch (error) {
      console.error('Validation error:', error)
      setTokenStatus({ error: 'Failed to validate token' })
    } finally {
      setValidating(false)
    }
  }

  const clearAllData = () => {
    // Clear all localStorage
    const keysToRemove = [
      'fb_connected',
      'fb_pages_synced',
      'fb_integration_status',
      'facebook_connected',
      'facebook_connected_at',
      'supabase.auth.token'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    alert('Cleared all local data. Try logging in again.')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Public Facebook Debug (No Auth Required)</h1>
          </div>

          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <p className="text-yellow-400">
              This is a public debug page that doesn't require authentication. 
              Use this to diagnose Facebook integration issues when you can't access the main app.
            </p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Running diagnostics...</p>
            </div>
          )}

          {diagnostics && !loading && (
            <div className="space-y-6">
              {/* Environment Check */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Environment Configuration
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Facebook App ID</span>
                    <span className={diagnostics.app_id ? 'text-green-400' : 'text-red-400'}>
                      {diagnostics.app_id || 'NOT CONFIGURED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">App Secret Status</span>
                    <span className={diagnostics.app_secret_configured ? 'text-green-400' : 'text-red-400'}>
                      {diagnostics.app_secret_configured ? 'Configured' : 'NOT CONFIGURED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Site URL</span>
                    <span className="text-gray-400 text-sm">
                      {diagnostics.site_url || window.location.origin}
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Status */}
              {diagnostics.database && (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database Check
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Facebook Integrations Table</span>
                      <span className={diagnostics.database.has_integrations ? 'text-green-400' : 'text-yellow-400'}>
                        {diagnostics.database.integrations_count || 0} records
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Active Integrations</span>
                      <span className="text-gray-400">
                        {diagnostics.database.active_count || 0}
                      </span>
                    </div>
                    {diagnostics.database.latest_integration && (
                      <div className="mt-4 p-3 bg-gray-800 rounded">
                        <p className="text-sm text-gray-400 mb-2">Latest Integration:</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>User: {diagnostics.database.latest_integration.facebook_user_name}</div>
                          <div>Created: {new Date(diagnostics.database.latest_integration.created_at).toLocaleString()}</div>
                          <div>Active: {diagnostics.database.latest_integration.is_active ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Token Status */}
              {tokenStatus && (
                <div className={`bg-gray-700 rounded-lg p-6 ${tokenStatus.success ? 'border-2 border-green-500' : 'border-2 border-red-500'}`}>
                  <h2 className="text-xl font-semibold text-white mb-4">Token Validation Result</h2>
                  {tokenStatus.success ? (
                    <div className="text-green-400">
                      <CheckCircle className="w-6 h-6 inline mr-2" />
                      {tokenStatus.message}
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <AlertCircle className="w-6 h-6 inline mr-2" />
                      {tokenStatus.error || 'Token validation failed'}
                      {tokenStatus.details && (
                        <div className="mt-2 text-sm text-gray-400">
                          {tokenStatus.details}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={runDiagnostics}
                  disabled={loading}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Re-run Diagnostics
                </button>

                <button
                  onClick={validateTokenPublic}
                  disabled={validating}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Check Token Status
                    </>
                  )}
                </button>

                <button
                  onClick={clearAllData}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Clear All Data & Re-login
                </button>

                <button
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  Go to Login
                </button>
              </div>

              {/* Quick Fix Guide */}
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
                <h3 className="text-blue-400 font-semibold mb-3">Common Issues & Fixes</h3>
                <div className="space-y-3 text-sm text-blue-300">
                  <div>
                    <strong>1. Can't access pages (redirects to login):</strong>
                    <ul className="ml-4 mt-1 list-disc">
                      <li>Click "Clear All Data & Re-login"</li>
                      <li>Log in with your credentials</li>
                      <li>Navigate to Settings → Integrations</li>
                    </ul>
                  </div>
                  <div>
                    <strong>2. Facebook shows "Not Active":</strong>
                    <ul className="ml-4 mt-1 list-disc">
                      <li>Click "Check Token Status" above</li>
                      <li>If invalid, you need to reconnect</li>
                      <li>Go to Settings → Integrations → Connect Facebook</li>
                    </ul>
                  </div>
                  <div>
                    <strong>3. Token expired:</strong>
                    <ul className="ml-4 mt-1 list-disc">
                      <li>Facebook tokens expire after 60 days</li>
                      <li>Simply reconnect to get a new token</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}