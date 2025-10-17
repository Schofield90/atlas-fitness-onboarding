'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function MembershipsDebugPage() {
  const [debugData, setDebugData] = useState<any>({ loading: true })
  const supabase = createClient()

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!user) {
          setDebugData({ 
            loading: false, 
            error: 'No authenticated user',
            userError 
          })
          return
        }
        
        // Get user's organization
        const { data: userOrg, error: orgError } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        if (!userOrg) {
          setDebugData({ 
            loading: false,
            user: { id: user.id, email: user.email },
            error: 'No organization found for user',
            orgError 
          })
          return
        }
        
        // Fetch membership plans
        const { data: plans, error: plansError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('organization_id', userOrg.organization_id)
          .order('created_at', { ascending: false })
        
        setDebugData({
          loading: false,
          user: { id: user.id, email: user.email },
          organizationId: userOrg.organization_id,
          membershipPlans: {
            count: plans?.length || 0,
            data: plans,
            error: plansError
          }
        })
      } catch (error: any) {
        setDebugData({ 
          loading: false,
          error: 'Exception occurred',
          exception: error.message,
          stack: error.stack
        })
      }
    }

    fetchDebugData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Memberships Debug</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <pre className="text-white whitespace-pre-wrap overflow-x-auto text-sm">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
        
        {!debugData.loading && debugData.membershipPlans?.data && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Membership Plans Found:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debugData.membershipPlans.data.map((plan: any) => (
                <div key={plan.id} className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="text-gray-400">£{(plan.price / 100).toFixed(2)}/{plan.billing_period}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}