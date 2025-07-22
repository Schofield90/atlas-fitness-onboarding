'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFacebookConnection } from '@/app/hooks/useFacebookConnection'

export default function FacebookDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const facebookConnection = useFacebookConnection()

  const fetchDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations/facebook/debug')
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error('Failed to fetch debug info:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  const testLocalStorage = () => {
    const connected = localStorage.getItem('facebook_connected')
    const connectedAt = localStorage.getItem('facebook_connected_at')
    
    console.log('localStorage test:', { connected, connectedAt })
    alert(`localStorage Test:\nConnected: ${connected}\nConnected At: ${connectedAt}`)
  }

  const clearConnection = () => {
    localStorage.removeItem('facebook_connected')
    localStorage.removeItem('facebook_connected_at')
    facebookConnection.refresh()
    console.log('🧹 Cleared Facebook connection from localStorage')
  }

  const simulateConnection = () => {
    const now = new Date().toISOString()
    localStorage.setItem('facebook_connected', 'true')
    localStorage.setItem('facebook_connected_at', now)
    facebookConnection.refresh()
    console.log('🔗 Simulated Facebook connection:', now)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              Gymleadhub
            </Link>
            <Link 
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">🔍 Facebook Integration Debug</h1>

        {/* Current Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Current Connection Status</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p><strong>Connected:</strong> <span className={facebookConnection.connected ? 'text-green-400' : 'text-red-400'}>{facebookConnection.connected ? 'Yes' : 'No'}</span></p>
              <p><strong>Connected At:</strong> {facebookConnection.connectedAt || 'N/A'}</p>
              <p><strong>Loading:</strong> {facebookConnection.loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {facebookConnection.error || 'None'}</p>
            </div>
            <div>
              <p><strong>Storage Method:</strong> {facebookConnection.debug?.storageMethod}</p>
              <p><strong>Last Checked:</strong> {facebookConnection.debug?.lastChecked}</p>
              <p><strong>Raw Value:</strong> {facebookConnection.debug?.rawValue || 'null'}</p>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Debug Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button 
              onClick={testLocalStorage}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
            >
              Test localStorage
            </button>
            <button 
              onClick={facebookConnection.refresh}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
            >
              Refresh Status
            </button>
            <button 
              onClick={clearConnection}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
            >
              Clear Connection
            </button>
            <button 
              onClick={simulateConnection}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
            >
              Simulate Connection
            </button>
          </div>
        </div>

        {/* API Debug Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">API Debug Info</h2>
            <button 
              onClick={fetchDebugInfo}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2 px-4 rounded transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {debugInfo ? (
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto text-gray-300">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-400">Loading debug info...</div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Troubleshooting Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Check if localStorage contains the connection data</li>
            <li>Verify the connection status is consistent across pages</li>
            <li>Test the OAuth flow end-to-end</li>
            <li>Clear the connection and reconnect if needed</li>
            <li>Check browser console for errors or warnings</li>
          </ol>
          
          <div className="mt-6 p-4 bg-gray-900 rounded">
            <h3 className="font-bold mb-2">Console Commands:</h3>
            <code className="text-sm text-gray-400">
              localStorage.getItem('facebook_connected')<br/>
              localStorage.getItem('facebook_connected_at')
            </code>
          </div>
        </div>
      </main>
    </div>
  )
}