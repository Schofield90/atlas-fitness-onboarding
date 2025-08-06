'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'

export default function AuthDebugPage() {
  const [authInfo, setAuthInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Check organization
      const orgResult = await getCurrentUserOrganization()
      
      // Check user_organizations table
      let userOrg = null
      if (user) {
        const { data, error } = await supabase
          .from('user_organizations')
          .select('*')
          .eq('user_id', user.id)
        userOrg = { data, error }
      }

      setAuthInfo({
        session: { data: session, error: sessionError },
        user: { data: user, error: userError },
        organization: orgResult,
        userOrganizations: userOrg,
        localStorage: {
          gymleadhub_trial_data: localStorage.getItem('gymleadhub_trial_data')
        }
      })
    } catch (error) {
      setAuthInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'sam@atlasfitness.com',
      password: 'password123'
    })
    
    if (error) {
      alert('Login failed: ' + error.message)
    } else {
      alert('Login successful! Refreshing...')
      window.location.reload()
    }
  }

  if (loading) {
    return <div className="p-8">Loading auth debug info...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="mb-4">
        <button
          onClick={login}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Quick Login (sam@atlasfitness.com)
        </button>
        <button
          onClick={() => window.location.reload()}
          className="ml-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Session:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(authInfo.session, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">User:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(authInfo.user, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Organization:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(authInfo.organization, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">User Organizations Table:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(authInfo.userOrganizations, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">LocalStorage:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(authInfo.localStorage, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="font-bold mb-2">Quick Actions:</h2>
        <div className="space-x-2">
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Go to Login
          </button>
          <button
            onClick={() => window.location.href = '/automations'}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Go to Automations
          </button>
          <button
            onClick={() => window.location.href = '/automations/builder'}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Go to Workflow Builder
          </button>
        </div>
      </div>
    </div>
  )
}