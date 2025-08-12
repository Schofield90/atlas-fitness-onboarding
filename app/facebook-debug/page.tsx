'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, RefreshCw, Settings, Database, Key } from 'lucide-react'

export default function FacebookDebugPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations/facebook/test-connection')
      const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Diagnostic error:', error)
      setDiagnostics({ error: 'Failed to run diagnostics' })
    } finally {
      setLoading(false)
    }
  }

  const fixConnection = async () => {
    setFixing(true)
    try {
      // Clear all Facebook data
      const response = await fetch('/api/integrations/meta/fix-connection', {
        method: 'POST'
      })
      const data = await response.json()
      
      // Clear localStorage
      localStorage.removeItem('fb_connected')
      localStorage.removeItem('fb_pages_synced')
      localStorage.removeItem('fb_integration_status')
      localStorage.removeItem('facebook_connected')
      localStorage.removeItem('facebook_connected_at')
      
      alert('Facebook integration reset complete! Please reconnect in Settings.')
      
      // Re-run diagnostics
      await runDiagnostics()
    } catch (error) {
      console.error('Fix error:', error)
      alert('Failed to fix connection')
    } finally {
      setFixing(false)
    }
  }

  const connectFacebook = () => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    
    const permissions = [
      'pages_show_list',
      'pages_read_engagement', 
      'pages_manage_metadata',
      'leads_retrieval',
      'ads_read',
      'ads_management',
      'business_management'
    ]

    const scope = permissions.join(',')
    const state = 'atlas_fitness_oauth'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `response_type=code`

    window.location.href = oauthUrl
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
            <h1 className="text-3xl font-bold text-white">Facebook Integration Diagnostics</h1>
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
                    <div className="flex items-center gap-2">
                      {diagnostics.environment?.app_id_configured ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-400">{diagnostics.environment.app_id_value}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-400">Not configured</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Facebook App Secret</span>
                    <div className="flex items-center gap-2">
                      {diagnostics.environment?.app_secret_configured ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-400">Configured</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-400 font-bold">NOT CONFIGURED - THIS IS THE ISSUE!</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!diagnostics.environment?.app_secret_configured && (
                  <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                    <h3 className="text-red-400 font-semibold mb-2">🚨 Critical Configuration Missing</h3>
                    <p className="text-red-300 mb-3">
                      The FACEBOOK_APP_SECRET environment variable is not configured. This is why Facebook OAuth is failing.
                    </p>
                    <div className="bg-gray-800 rounded p-3 mt-3">
                      <p className="text-white font-semibold mb-2">To fix this:</p>
                      <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm">
                        <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" className="text-blue-400 underline">Facebook Developers</a></li>
                        <li>Select your app (or create one if needed)</li>
                        <li>Go to Settings → Basic</li>
                        <li>Copy the App Secret (click "Show" and enter your password)</li>
                        <li>Add to Vercel: Go to your project settings → Environment Variables</li>
                        <li>Add: FACEBOOK_APP_SECRET = [your app secret]</li>
                        <li>Redeploy the application</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Database Check */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">User Authenticated</span>
                    <div className="flex items-center gap-2">
                      {diagnostics.user?.authenticated ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-400">Yes</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                          <span className="text-yellow-400">No</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Organization ID</span>
                    <span className="text-gray-400 text-sm font-mono">
                      {diagnostics.user?.organization_id || 'Not found'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Existing Integrations</span>
                    <span className="text-gray-400">
                      {diagnostics.database?.integrations_found || 0} found
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={runDiagnostics}
                  disabled={loading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Re-run Diagnostics
                </button>
                
                <button
                  onClick={fixConnection}
                  disabled={fixing}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                >
                  {fixing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Settings className="w-5 h-5" />
                      Reset Facebook Integration
                    </>
                  )}
                </button>

                {diagnostics.environment?.app_secret_configured && (
                  <button
                    onClick={connectFacebook}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Connect Facebook
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
                <h3 className="text-blue-400 font-semibold mb-3">Quick Fix Instructions</h3>
                <ol className="list-decimal list-inside text-blue-300 space-y-2 text-sm">
                  {diagnostics.instructions?.fix_steps?.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}