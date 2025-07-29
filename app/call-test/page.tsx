'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle } from 'lucide-react'

export default function CallTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  
  const [testType, setTestType] = useState<'voice-config' | 'simple-call' | 'debug-call'>('voice-config')
  const [phoneNumber, setPhoneNumber] = useState('+447490253471')
  const [userPhone, setUserPhone] = useState('')

  const runTest = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      let response
      
      switch (testType) {
        case 'voice-config':
          response = await fetch('/api/debug/check-twilio-voice')
          break
          
        case 'simple-call':
          response = await fetch('/api/debug/simple-call-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              to: phoneNumber,
              userPhone: userPhone || undefined 
            })
          })
          break
          
        case 'debug-call':
          response = await fetch('/api/debug/test-call-debug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phoneNumber })
          })
          break
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Test failed')
      }
      
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to run test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Call System Testing</h1>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Type</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg"
            >
              <option value="voice-config">Check Voice Configuration</option>
              <option value="simple-call">Simple Call Test</option>
              <option value="debug-call">Full Debug Test</option>
            </select>
          </div>
          
          {(testType === 'simple-call' || testType === 'debug-call') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Lead Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                  placeholder="+447777777777"
                />
              </div>
              
              {testType === 'simple-call' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Phone Number (optional - uses env var if empty)
                  </label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                    placeholder="+447777777777"
                  />
                </div>
              )}
            </>
          )}
          
          <button
            onClick={runTest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
            {loading ? 'Running Test...' : 'Run Test'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {result && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          {result.recommendations && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    {rec.includes('appears correct') ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}