'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBritishCurrency, formatBritishDate } from '@/lib/utils/british-format'
import { Trash2, Edit2, Tag } from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  times_used: number
  is_active: boolean
  created_at: string
}

export default function DiscountCodesPage() {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    validFrom: '',
    validUntil: '',
    usageLimit: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDiscountCodes()
  }, [])

  const fetchDiscountCodes = async () => {
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!staffData?.organization_id) return

      // Fetch discount codes
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('organization_id', staffData.organization_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching discount codes:', error)
        // If table doesn't exist, show empty state
        if (error.code === '42P01') {
          setDiscountCodes([])
        }
      } else {
        setDiscountCodes(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create discount codes')
        return
      }

      // Get user's organization
      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!staffData?.organization_id) {
        alert('No organization found')
        return
      }

      // Convert discount value based on type
      let discountValue: number
      if (formData.discountType === 'percentage') {
        discountValue = parseInt(formData.discountValue)
      } else {
        // Convert pounds to pennies
        discountValue = Math.round(parseFloat(formData.discountValue) * 100)
      }

      // Create the discount code
      const { error } = await supabase
        .from('discount_codes')
        .insert({
          organization_id: staffData.organization_id,
          code: formData.code.toUpperCase(),
          description: formData.description || null,
          discount_type: formData.discountType,
          discount_value: discountValue,
          valid_from: formData.validFrom || null,
          valid_until: formData.validUntil || null,
          usage_limit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          created_by: user.id,
          is_active: true
        })

      if (error) {
        console.error('Error creating discount code:', error)
        if (error.code === '42P01') {
          alert('Discount codes table not found. Please run the migration first.')
        } else if (error.code === '23505') {
          alert('This discount code already exists')
        } else {
          alert('Failed to create discount code')
        }
        return
      }

      // Reset form and close modal
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        validFrom: '',
        validUntil: '',
        usageLimit: ''
      })
      setShowCreateModal(false)
      fetchDiscountCodes()
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchDiscountCodes()
    } catch (error) {
      console.error('Error toggling discount status:', error)
      alert('Failed to update discount code')
    }
  }

  const deleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDiscountCodes()
    } catch (error) {
      console.error('Error deleting discount:', error)
      alert('Failed to delete discount code')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Discount Codes</h2>
              <p className="text-gray-400 mt-1">Create and manage promotional codes for your services</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
            >
              + Create Discount Code
            </button>
          </div>

          {/* Discount Codes List */}
          <div className="bg-gray-800 rounded-lg">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading discount codes...</p>
              </div>
            ) : discountCodes.length === 0 ? (
              <div className="p-6">
                <div className="text-center py-8">
                  <Tag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 mb-2">No discount codes created yet</p>
                  <p className="text-sm text-gray-500">Click "Create Discount Code" to offer promotions to your customers</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Valid Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {discountCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-orange-500">{code.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300">{code.description || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm">
                            {code.discount_type === 'percentage' 
                              ? `${code.discount_value}%`
                              : formatBritishCurrency(code.discount_value, true)
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            {code.valid_from && (
                              <div className="text-gray-400">
                                From: {formatBritishDate(code.valid_from)}
                              </div>
                            )}
                            {code.valid_until && (
                              <div className="text-gray-400">
                                Until: {formatBritishDate(code.valid_until)}
                              </div>
                            )}
                            {!code.valid_from && !code.valid_until && (
                              <span className="text-gray-500">Always valid</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            <div>{code.times_used} used</div>
                            {code.usage_limit && (
                              <div className="text-gray-400">of {code.usage_limit}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(code.id, code.is_active)}
                            className={`px-2 py-1 text-xs rounded ${
                              code.is_active 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gray-600 hover:bg-gray-700'
                            } transition-colors`}
                          >
                            {code.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => deleteDiscount(code.id)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Create Discount Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Create Discount Code</h3>
                <form onSubmit={handleCreateDiscount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="e.g., SUMMER20"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Summer promotion"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          {formData.discountType === 'percentage' ? '%' : '£'}
                        </span>
                        <input
                          type="number"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                          placeholder="20"
                          step={formData.discountType === 'fixed' ? '0.01' : '1'}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Valid From</label>
                      <input
                        type="date"
                        value={formData.validFrom}
                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Valid Until</label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Usage Limit (Optional)</label>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Code'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}