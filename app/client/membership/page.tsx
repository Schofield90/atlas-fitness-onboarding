'use client'

import { CreditCard, Calendar, Activity, ChevronLeft, Package, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { format, parseISO } from 'date-fns'

export default function ClientMembershipPage() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState<any>(null)
  const [membershipPlan, setMembershipPlan] = useState<any>(null)
  const [usageStats, setUsageStats] = useState({
    classesThisMonth: 0,
    creditsUsed: 0,
    creditsRemaining: 0
  })
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (client) {
      loadMembership()
      loadUsageStats()
    }
  }, [client])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/client-portal/login')
      return
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!clientData) {
      router.push('/client-portal/login')
      return
    }

    setClient(clientData)
    setLoading(false)
  }

  const loadMembership = async () => {
    // Get active membership
    const { data: membershipData } = await supabase
      .from('memberships')
      .select(`
        *,
        membership_plans (
          *
        )
      `)
      .eq('customer_id', client.id)
      .eq('status', 'active')
      .single()

    if (membershipData) {
      setMembership(membershipData)
      setMembershipPlan(membershipData.membership_plans)
    }
  }

  const loadUsageStats = async () => {
    // Get bookings for current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', client.id)
      .gte('created_at', startOfMonth.toISOString())

    const classesThisMonth = bookings?.length || 0

    // Get credit usage
    const { data: credits } = await supabase
      .from('class_credits')
      .select('*')
      .eq('customer_id', client.id)
      .single()

    setUsageStats({
      classesThisMonth,
      creditsUsed: credits?.credits_used || 0,
      creditsRemaining: credits?.credits_remaining || 0
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/client')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Membership</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Membership Status */}
        {membership ? (
          <>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {membershipPlan?.name || 'Standard Membership'}
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="h-4 w-4" />
                      <span>{membershipPlan?.description || 'Full gym access'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Active since {format(parseISO(membership.start_date), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="h-4 w-4" />
                      <span>£{membershipPlan?.price_pennies / 100}/month</span>
                    </div>
                  </div>
                </div>
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  Active
                </span>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {usageStats.classesThisMonth}
                    </div>
                    <div className="text-sm text-gray-500">Classes This Month</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {usageStats.creditsRemaining}
                    </div>
                    <div className="text-sm text-gray-500">Credits Remaining</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {membershipPlan?.monthly_credits || 'Unlimited'}
                    </div>
                    <div className="text-sm text-gray-500">Monthly Credits</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership Benefits */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Benefits</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">
                    {membershipPlan?.monthly_credits ? `${membershipPlan.monthly_credits} classes per month` : 'Unlimited classes'}
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">Access to all gym locations</span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">Book classes up to 2 weeks in advance</span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-700">Priority waitlist access</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Membership</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Update Payment Method</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Freeze Membership</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">View Billing History</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Membership</h2>
            <p className="text-gray-600 mb-6">
              You don't have an active membership. Join today to start your fitness journey!
            </p>
            <button
              onClick={() => router.push('/memberships')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Membership Options
            </button>
          </div>
        )}
      </main>
    </div>
  )
}