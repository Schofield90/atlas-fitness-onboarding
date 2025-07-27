'use client'

import { useState } from 'react'

export default function WhatsAppDebugPage() {
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [testMessage, setTestMessage] = useState('where is the gym located')
  const [testResponse, setTestResponse] = useState<any>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/debug/ai-knowledge-test?message=${encodeURIComponent(testMessage)}`)
      const data = await res.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Diagnostic error:', error)
    } finally {
      setLoading(false)
    }
  }

  const testWhatsApp = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/test-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage })
      })
      const data = await res.json()
      setTestResponse(data)
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">WhatsApp AI Debug Dashboard</h1>
      
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Message</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Enter test message..."
          />
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Run Diagnostics
          </button>
          <button
            onClick={testWhatsApp}
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test AI Response
          </button>
        </div>
      </div>

      {testResponse && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">AI Response Test</h2>
          <div className="space-y-2">
            <p><strong>Success:</strong> {testResponse.success ? '✅' : '❌'}</p>
            <p><strong>User Message:</strong> {testResponse.userMessage}</p>
            <p><strong>AI Response:</strong> {testResponse.aiResponse}</p>
            {testResponse.debug && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <p><strong>Knowledge Items Found:</strong> {testResponse.debug.knowledgeItemsFound}</p>
                <p><strong>Contains Real Data:</strong> {testResponse.debug.knowledgeContainsRealData ? '✅' : '❌'}</p>
                <div className="mt-2">
                  <strong>First Knowledge Item:</strong>
                  <pre className="mt-1 text-sm bg-gray-200 p-2 rounded overflow-x-auto">
                    {testResponse.debug.firstKnowledgeItem}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {diagnostics && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Supabase Connected</p>
                <p className="text-lg font-medium">{diagnostics.diagnostics.supabaseConnected ? '✅ Yes' : '❌ No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Knowledge Items</p>
                <p className="text-lg font-medium">{diagnostics.diagnostics.totalKnowledgeItems}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Core Knowledge Count</p>
                <p className="text-lg font-medium">{diagnostics.diagnostics.coreKnowledgeCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Relevant Knowledge Count</p>
                <p className="text-lg font-medium">{diagnostics.diagnostics.relevantKnowledgeCount}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Real Data Check</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(diagnostics.diagnostics.hasRealData).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span>{value ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Location Knowledge ({diagnostics.diagnostics.locationKnowledgeCount} items)</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {diagnostics.locationKnowledge.map((item: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(item.created).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">AI Test Result</h2>
            {diagnostics.aiTestResult.success ? (
              <div className="space-y-2">
                <p><strong>Response:</strong> {diagnostics.aiTestResult.response}</p>
                <p><strong>Uses Real Data:</strong> {diagnostics.aiTestResult.usesRealData ? '✅ Yes' : '❌ No'}</p>
              </div>
            ) : (
              <div className="text-red-600">
                <p><strong>Error:</strong> {diagnostics.aiTestResult.error}</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
            <ul className="space-y-2">
              {diagnostics.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Knowledge Context Preview</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
              {diagnostics.knowledgeContextPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}