'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { CreditCard, Calendar, Clock, PauseCircle } from 'lucide-react'
import { formatBritishDate, formatBritishCurrency } from '@/app/lib/utils/british-format'
import AddMembershipModal from '../AddMembershipModal'

interface MembershipsTabProps {
  customerId: string
}

export default function MembershipsTab({ customerId }: MembershipsTabProps) {
  const [memberships, setMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchMemberships()
    fetchCustomerName()
  }, [customerId])

  const fetchCustomerName = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('name')
        .eq('id', customerId)
        .single()
      
      if (!error && data) {
        setCustomerName(data.name)
      }
    } catch (error) {
      console.error('Error fetching customer name:', error)
    }
  }

  const fetchMemberships = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership_plan:membership_plans(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') throw error
      setMemberships(data || [])
    } catch (error) {
      console.error('Error fetching memberships:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600'
      case 'paused':
        return 'bg-yellow-600'
      case 'cancelled':
        return 'bg-red-600'
      case 'expired':
        return 'bg-gray-600'
      default:
        return 'bg-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading memberships...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Memberships</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Membership
        </button>
      </div>
      
      {memberships.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No active memberships</p>
          <p className="text-sm text-gray-500 mt-2">
            Add a membership to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div key={membership.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white">
                    {membership.membership_plan?.name || 'Membership'}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Started {formatBritishDate(membership.start_date)}
                    </span>
                    {membership.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Ends {formatBritishDate(membership.end_date)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-lg font-semibold text-white">
                      {formatBritishCurrency(membership.membership_plan?.price || 0)}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">
                      /{membership.membership_plan?.billing_period || 'month'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-xs text-white rounded-full ${getStatusColor(membership.status)}`}>
                    {membership.status}
                  </span>
                  {membership.status === 'active' && (
                    <button className="mt-2 flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                      <PauseCircle className="h-4 w-4" />
                      Pause
                    </button>
                  )}
                </div>
              </div>
              
              {membership.membership_plan?.features && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-400 mb-2">Includes:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {Object.entries(membership.membership_plan.features).map(([key, value]) => (
                      <li key={key}>• {key}: {String(value)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <AddMembershipModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        customerId={customerId}
        customerName={customerName}
        onSuccess={() => {
          fetchMemberships()
          setShowAddModal(false)
        }}
      />
    </div>
  )
}