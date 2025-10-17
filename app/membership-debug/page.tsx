'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function MembershipDebugPage() {
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const supabase = createClient()

  const checkMemberships = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user's organization from staff table
      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user?.id || '')
        .single()
      
      // Check if user owns an organization
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user?.id || '')
        .single()
      
      // Check all membership plans
      const { data: allPlans, error: allError } = await supabase
        .from('membership_plans')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Check membership plans for user's organization
      let orgPlans = null
      let orgError = null
      const orgId = staffData?.organization_id || ownedOrg?.id
      
      if (orgId) {
        const { data, error } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
        
        orgPlans = data
        orgError = error
      }
      
      setDebugInfo({
        user: {
          id: user?.id,
          email: user?.email
        },
        staff_entry: {
          exists: !!staffData,
          organization_id: staffData?.organization_id || null
        },
        owned_organization: {
          exists: !!ownedOrg,
          id: ownedOrg?.id || null,
          name: ownedOrg?.name || null
        },
        organization_id: staffData?.organization_id || ownedOrg?.id || null,
        all_plans: {
          count: allPlans?.length || 0,
          error: allError?.message,
          data: allPlans
        },
        org_plans: {
          count: orgPlans?.length || 0,
          error: orgError?.message,
          data: orgPlans
        },
        latest_plan: allPlans?.[0] || null
      })
    } catch (error: any) {
      setDebugInfo({
        error: error.message,
        stack: error.stack
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Membership Plans Debug</h1>
        
        <button
          onClick={checkMemberships}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg mb-8"
        >
          {loading ? 'Checking...' : 'Check Memberships'}
        </button>

        {debugInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <pre className="text-white whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}