'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkEverything()
  }, [])

  const checkEverything = async () => {
    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      let info: any = {
        userCheck: {
          isLoggedIn: !!user,
          userId: user?.id || 'Not logged in',
          email: user?.email || 'No email',
          error: userError?.message || null
        }
      }

      if (user) {
        // 2. Check super_admin_users table
        const { data: adminData, error: adminError } = await supabase
          .from('super_admin_users')
          .select('*')
          .eq('user_id', user.id)

        info.adminTableCheck = {
          hasEntry: !!adminData && adminData.length > 0,
          data: adminData,
          error: adminError?.message || null
        }

        // 3. Check if email matches admin emails
        const adminEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
        info.emailCheck = {
          userEmail: user.email,
          isAdminEmail: user.email ? adminEmails.includes(user.email.toLowerCase()) : false,
          expectedEmails: adminEmails
        }

        // 4. Check session
        const { data: { session } } = await supabase.auth.getSession()
        info.sessionCheck = {
          hasSession: !!session,
          expiresAt: session?.expires_at,
          accessToken: session?.access_token ? 'Present' : 'Missing'
        }

        // 5. Check organization
        const { data: orgData } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)

        info.organizationCheck = {
          hasOrganization: !!orgData && orgData.length > 0,
          organizations: orgData
        }
      }

      setDebugInfo(info)
    } catch (error: any) {
      setDebugInfo({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const navigateToAdmin = () => {
    router.push('/admin/simple-dashboard')
  }

  const forceLogin = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-purple-500">Admin Debug Page</h1>
        
        <div className="space-y-6">
          {/* User Check */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-blue-400">1. User Authentication</h2>
            <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(debugInfo.userCheck, null, 2)}
            </pre>
          </div>

          {/* Email Check */}
          {debugInfo.emailCheck && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-green-400">2. Email Authorization</h2>
              <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
                {JSON.stringify(debugInfo.emailCheck, null, 2)}
              </pre>
              {debugInfo.emailCheck.isAdminEmail && (
                <div className="mt-4 p-3 bg-green-900 border border-green-600 rounded">
                  ✅ Your email IS authorized for admin access
                </div>
              )}
              {!debugInfo.emailCheck.isAdminEmail && debugInfo.userCheck.isLoggedIn && (
                <div className="mt-4 p-3 bg-red-900 border border-red-600 rounded">
                  ❌ Your email ({debugInfo.emailCheck.userEmail}) is NOT in the admin list
                </div>
              )}
            </div>
          )}

          {/* Admin Table Check */}
          {debugInfo.adminTableCheck && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">3. Super Admin Table</h2>
              <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
                {JSON.stringify(debugInfo.adminTableCheck, null, 2)}
              </pre>
              {debugInfo.adminTableCheck.hasEntry && (
                <div className="mt-4 p-3 bg-green-900 border border-green-600 rounded">
                  ✅ You have an entry in super_admin_users table
                </div>
              )}
            </div>
          )}

          {/* Session Check */}
          {debugInfo.sessionCheck && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-orange-400">4. Session Status</h2>
              <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
                {JSON.stringify(debugInfo.sessionCheck, null, 2)}
              </pre>
            </div>
          )}

          {/* Organization Check */}
          {debugInfo.organizationCheck && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-pink-400">5. Organization</h2>
              <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
                {JSON.stringify(debugInfo.organizationCheck, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={navigateToAdmin}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Try Admin Dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go to Main Dashboard
          </button>
          <button
            onClick={forceLogin}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Sign Out & Login Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            Refresh Debug Info
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-bold mb-2">What should I see?</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            <li>User Authentication should show isLoggedIn: true</li>
            <li>Email should be sam@atlas-gyms.co.uk</li>
            <li>Email Authorization should show isAdminEmail: true</li>
            <li>Super Admin Table should show hasEntry: true</li>
          </ul>
        </div>
      </div>
    </div>
  )
}