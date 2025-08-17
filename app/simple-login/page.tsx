'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function SimpleLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const supabase = createClient()
      
      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        setMessage('Login failed: ' + error.message)
        setSuccess(false)
      } else {
        setMessage('Login successful! Redirecting...')
        setSuccess(true)
        
        // Fix organization membership
        try {
          await fetch('/api/auth/emergency-fix')
        } catch (e) {
          console.log('Could not fix org, but continuing...')
        }
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    } catch (error: any) {
      setMessage('Error: ' + error.message)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Simple Login (No Redirect Loop)
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="••••••••"
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded-lg ${
              success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
            }`}>
              <p className={success ? 'text-green-400' : 'text-red-400'}>
                {message}
              </p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg font-semibold"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="mt-6 space-y-3">
          <a
            href="/dashboard"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-center py-3 px-6 rounded-lg"
          >
            Try Dashboard Directly
          </a>
          
          <a
            href="/connect-facebook"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-6 rounded-lg"
          >
            Connect Facebook (After Login)
          </a>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            This login page won't redirect you in a loop. After login, you'll go straight to the dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}