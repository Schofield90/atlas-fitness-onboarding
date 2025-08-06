'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function QuickLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const quickLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'sam@atlasfitness.com',
        password: 'password123'
      })
      
      if (error) {
        setError(error.message)
        return
      }
      
      // Force a hard refresh to ensure all auth state is updated
      window.location.href = '/automations'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Quick Login</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <button
          onClick={quickLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login as sam@atlasfitness.com'}
        </button>
        
        <button
          onClick={logout}
          className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors"
        >
          Logout
        </button>
        
        <div className="mt-6 space-y-2">
          <a href="/automations" className="block text-center text-blue-400 hover:text-blue-300">
            Go to Automations →
          </a>
          <a href="/automations/builder" className="block text-center text-blue-400 hover:text-blue-300">
            Go to Workflow Builder →
          </a>
          <a href="/dashboard" className="block text-center text-blue-400 hover:text-blue-300">
            Go to Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}