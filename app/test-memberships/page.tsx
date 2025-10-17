'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function TestMembershipsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const testQueries = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Get user's organization
      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', user?.id || '')
        .single()
      
      // Get organization details
      const { data: org, error: orgDetailsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userOrg?.organization_id || '')
        .single()
      
      // Get membership plans - simple query
      const { data: plans, error: plansError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', userOrg?.organization_id || '')
      
      // Get ALL membership plans (no filter)
      const { data: allPlans, error: allPlansError } = await supabase
        .from('membership_plans')
        .select('*')
      
      setData({
        user: {
          id: user?.id,
          email: user?.email,
          error: userError?.message
        },
        userOrganization: {
          data: userOrg,
          error: orgError?.message
        },
        organization: {
          data: org,
          error: orgDetailsError?.message
        },
        membershipPlans: {
          count: plans?.length || 0,
          data: plans,
          error: plansError?.message
        },
        allMembershipPlans: {
          count: allPlans?.length || 0,
          data: allPlans,
          error: allPlansError?.message
        }
      })
    } catch (error: any) {
      setData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testQueries()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Test Membership Queries</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <pre className="text-white whitespace-pre-wrap overflow-x-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        
        <button
          onClick={() => {
            setLoading(true)
            testQueries()
          }}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}