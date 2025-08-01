'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'
import { formatBritishCurrency } from '@/app/lib/utils/british-format'

interface AddMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  customerName: string
  onSuccess: () => void
}

export default function AddMembershipModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess
}: AddMembershipModalProps) {
  const [membershipPlans, setMembershipPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchMembershipPlans()
    }
  }, [isOpen])

  const fetchMembershipPlans = async () => {
    try {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Get active membership plans
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      setMembershipPlans(data || [])
    } catch (error) {
      console.error('Error fetching membership plans:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId) {
      setError('Please select a membership plan')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) throw new Error('No organization found')

      // Calculate end date based on billing period
      const selectedPlan = membershipPlans.find(p => p.id === selectedPlanId)
      let endDate = null
      if (selectedPlan) {
        const start = new Date(startDate)
        if (selectedPlan.billing_period === 'monthly') {
          endDate = new Date(start.setMonth(start.getMonth() + 1))
        } else if (selectedPlan.billing_period === 'yearly') {
          endDate = new Date(start.setFullYear(start.getFullYear() + 1))
        }
      }

      // Create customer membership
      const { error: insertError } = await supabase
        .from('customer_memberships')
        .insert({
          organization_id: userOrg.organization_id,
          customer_id: customerId,
          membership_plan_id: selectedPlanId,
          status: 'active',
          start_date: startDate,
          end_date: endDate?.toISOString().split('T')[0],
          next_billing_date: endDate?.toISOString().split('T')[0],
          notes: notes || null,
          created_by: user.id
        })

      if (insertError) throw insertError

      onSuccess()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Error adding membership:', error)
      setError(error.message || 'Failed to add membership')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedPlanId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Add Membership</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Add membership for <span className="text-white font-medium">{customerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Membership Plan *
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a plan</option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatBritishCurrency(plan.price, true)}/{plan.billing_period}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            />
          </div>

          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}