'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCheckPage() {
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
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
      let organization = null
      if (user) {
        const { data: orgData } = await supabase
          .from('user_organizations')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .single()
        
        organization = orgData
      }

      setAuthStatus({
        session: session || null,
        sessionError,
        user: user || null,
        userError,
        organization,
        isAuthenticated: !!session && !!user
      })
    } catch (error) {
      console.error('Auth check error:', error)
      setAuthStatus({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const handleGoToAutomations = () => {
    router.push('/automations/builder/new')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Checking authentication...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Status Check</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-2">Session Status:</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasSession: !!authStatus?.session,
                sessionError: authStatus?.sessionError,
                expiresAt: authStatus?.session?.expires_at
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-2">User Status:</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasUser: !!authStatus?.user,
                userId: authStatus?.user?.id,
                email: authStatus?.user?.email,
                userError: authStatus?.userError
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-2">Organization Status:</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify({
                hasOrganization: !!authStatus?.organization,
                organizationId: authStatus?.organization?.organization_id,
                organizationName: authStatus?.organization?.organizations?.name,
                role: authStatus?.organization?.role
              }, null, 2)}
            </pre>
          </div>

          <div className="pt-4 border-t">
            <h2 className="font-semibold text-lg mb-2">Summary:</h2>
            <div className={`p-3 rounded ${authStatus?.isAuthenticated ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {authStatus?.isAuthenticated ? (
                <div>
                  <p>✅ You are authenticated!</p>
                  <p className="text-sm mt-1">Email: {authStatus?.user?.email}</p>
                  {authStatus?.organization && (
                    <p className="text-sm">Organization: {authStatus?.organization?.organizations?.name}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p>❌ You are not authenticated</p>
                  <p className="text-sm mt-1">Please log in to continue</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            {!authStatus?.isAuthenticated && (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            )}
            {authStatus?.isAuthenticated && (
              <button
                onClick={handleGoToAutomations}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Go to Automations Builder
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Note:</h3>
          <p className="text-sm text-yellow-700">
            The middleware is currently disabled. Authentication checks are happening at the component level.
            If you're being redirected to login, it's because the component is checking for authentication.
          </p>
        </div>
      </div>
    </div>
  )
}