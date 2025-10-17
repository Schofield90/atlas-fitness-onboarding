'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthTestPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      setResult({ 
        success: !error, 
        data: data?.user ? { id: data.user.id, email: data.user.email } : null, 
        error: error?.message 
      })
    } catch (err: any) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    setLoading(true)
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      setResult({ 
        session: session ? { 
          user: { id: session.user.id, email: session.user.email },
          expires_at: session.expires_at
        } : null,
        user: user ? { id: user.id, email: user.email } : null,
        error: error?.message 
      })
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const testSupabaseConnection = async () => {
    setLoading(true)
    try {
      // Test basic query
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1)
      
      setResult({ 
        connected: !error,
        data,
        error: error?.message,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL
      })
    } catch (err: any) {
      setResult({ connected: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Auth Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 mb-3"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={testLogin}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Test Login
            </button>
            <button
              onClick={checkSession}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Check Session
            </button>
            <button
              onClick={testSupabaseConnection}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Result:</h3>
            <pre className="text-gray-300 whitespace-pre-wrap text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}