'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DebugOrgPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkOrganization()
  }, [])

  const checkOrganization = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setData({ error: 'No authenticated user' })
        setLoading(false)
        return
      }

      // Check organization_members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('user_id', user.id)

      // Check if user_organizations exists
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', user.id)

      setData({
        user,
        organization_members: { data: members, error: membersError },
        user_organizations: { data: userOrgs, error: userOrgsError },
        tables: {
          organization_members: members?.length || 0,
          user_organizations: userOrgs?.length || 0
        }
      })
    } catch (error: any) {
      setData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const clearOrganization = async () => {
    if (!confirm('This will remove you from all organizations. Continue?')) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Delete from organization_members
    await supabase
      .from('organization_members')
      .delete()
      .eq('user_id', user.id)

    // Refresh
    window.location.reload()
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Organization Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="font-bold mb-2">Quick Actions:</h2>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/onboarding')}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
            >
              Go to Onboarding
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
            >
              Go to Dashboard
            </button>
            <button
              onClick={clearOrganization}
              className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
            >
              Clear My Organizations
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="font-bold mb-2">Debug Data:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}