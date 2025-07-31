'use client'

import { useState } from 'react'
import { X, Mail, User, Shield } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface InviteStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function InviteStaffDialog({ open, onOpenChange, onSuccess }: InviteStaffDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'staff',
    sendInvite: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) throw new Error('Organization not found')

      // Send invitation (in production, this would send an email)
      // For now, we'll just create a placeholder
      const inviteData = {
        organization_id: userOrg.organization_id,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        invited_by: user.id,
        status: 'pending'
      }

      // In a real implementation, you would:
      // 1. Send an invitation email with a unique link
      // 2. Create a pending invitation record
      // 3. Handle the invitation acceptance flow

      console.log('Invitation data:', inviteData)
      
      // Show success message
      onSuccess()
      
      // Reset form
      setFormData({
        email: '',
        name: '',
        role: 'staff',
        sendInvite: true
      })
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      setError(error.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Invite Staff Member</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="staff@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Smith"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Role *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.role === 'admin' 
                ? 'Admins can manage settings, staff, and all data'
                : 'Staff can manage leads, bookings, and communications'
              }
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendInvite"
              checked={formData.sendInvite}
              onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sendInvite" className="ml-2 text-sm text-gray-300">
              Send invitation email immediately
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong>Note:</strong> The invited staff member will receive an email to create their account and join your organization.
          </p>
        </div>
      </div>
    </div>
  )
}