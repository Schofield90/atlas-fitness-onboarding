'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '../components/DashboardLayout'

export default function SimpleMembershipsPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPlans() {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No user')

        // Get user org
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        if (!userOrg) throw new Error('No org')

        // Get plans
        const { data, error } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('organization_id', userOrg.organization_id)
        
        if (error) throw error
        
        setPlans(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadPlans()
  }, [])

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Simple Memberships Test</h1>
        
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        
        {!loading && !error && (
          <div>
            <p className="mb-4">Found {plans.length} membership plans</p>
            <div className="space-y-4">
              {plans.map(plan => (
                <div key={plan.id} className="bg-gray-800 p-4 rounded">
                  <h3 className="font-bold">{plan.name}</h3>
                  <p>£{(plan.price / 100).toFixed(2)}/{plan.billing_period}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}