'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Users, Plus, Trash2, Link, Unlink } from 'lucide-react'

interface FamilyTabProps {
  customerId: string
  organizationId: string
}

export default function FamilyTab({ customerId, organizationId }: FamilyTabProps) {
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchFamilyMembers()
    fetchAllCustomers()
  }, [customerId])

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true)
      // Fetch where this customer is the primary
      const { data: primaryData } = await supabase
        .from('customer_family_members')
        .select(`
          *,
          family_member:leads!customer_family_members_family_member_id_fkey(*)
        `)
        .eq('primary_customer_id', customerId)

      // Fetch where this customer is a family member
      const { data: memberData } = await supabase
        .from('customer_family_members')
        .select(`
          *,
          primary_customer:leads!customer_family_members_primary_customer_id_fkey(*)
        `)
        .eq('family_member_id', customerId)

      const allFamily = [
        ...(primaryData || []).map(item => ({
          ...item,
          member: item.family_member,
          relation_type: 'primary'
        })),
        ...(memberData || []).map(item => ({
          ...item,
          member: item.primary_customer,
          relation_type: 'member',
          relationship: getInverseRelationship(item.relationship)
        }))
      ]

      setFamilyMembers(allFamily)
    } catch (error) {
      console.error('Error fetching family members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCustomers = async () => {
    try {
      const { data } = await supabase
        .from('leads')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .neq('id', customerId)
        .order('name')

      setAllCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const getInverseRelationship = (relationship: string) => {
    const inverseMap: Record<string, string> = {
      'parent': 'child',
      'child': 'parent',
      'spouse': 'spouse',
      'sibling': 'sibling',
      'guardian': 'dependent',
      'dependent': 'guardian'
    }
    return inverseMap[relationship] || relationship
  }

  const handleAddFamilyMember = async () => {
    if (!selectedCustomer) return

    try {
      const { error } = await supabase
        .from('customer_family_members')
        .insert({
          organization_id: organizationId,
          primary_customer_id: customerId,
          family_member_id: selectedCustomer,
          relationship: relationship,
          is_primary_guardian: relationship === 'parent',
          can_pickup: true
        })

      if (error) throw error

      setShowAddModal(false)
      setSelectedCustomer('')
      setRelationship('parent')
      fetchFamilyMembers()
    } catch (error) {
      console.error('Error adding family member:', error)
      alert('Failed to add family member')
    }
  }

  const handleRemoveFamilyMember = async (memberId: string, relationType: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return

    try {
      if (relationType === 'primary') {
        await supabase
          .from('customer_family_members')
          .delete()
          .eq('primary_customer_id', customerId)
          .eq('family_member_id', memberId)
      } else {
        await supabase
          .from('customer_family_members')
          .delete()
          .eq('primary_customer_id', memberId)
          .eq('family_member_id', customerId)
      }

      fetchFamilyMembers()
    } catch (error) {
      console.error('Error removing family member:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading family members...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Family Members</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Family Member
        </button>
      </div>

      {/* Family Members List */}
      {familyMembers.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No family members linked</p>
          <p className="text-sm text-gray-500 mt-2">
            Link family members to manage their accounts together
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {familyMembers.map((family) => (
            <div key={family.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{family.member.name}</h4>
                    <p className="text-sm text-gray-400 capitalize">
                      {family.relationship}
                      {family.is_primary_guardian && (
                        <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                          Primary Guardian
                        </span>
                      )}
                      {family.can_pickup && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          Can Pickup
                        </span>
                      )}
                    </p>
                    {family.member.email && (
                      <p className="text-sm text-gray-500 mt-1">{family.member.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFamilyMember(family.member.id, family.relation_type)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Unlink className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Family Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Customer
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Choose a customer...</option>
                  {allCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.email && `(${customer.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="spouse">Spouse</option>
                  <option value="sibling">Sibling</option>
                  <option value="guardian">Guardian</option>
                  <option value="dependent">Dependent</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFamilyMember}
                disabled={!selectedCustomer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Family Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}