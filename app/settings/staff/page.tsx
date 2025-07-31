'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Plus } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import StaffTable from '@/app/components/settings/staff/StaffTable'
import InviteStaffDialog from '@/app/components/settings/staff/InviteStaffDialog'

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Get all staff from organization_staff table
      const { data: staffDetails } = await supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })

      // Get current user's details for the owner
      const currentUserStaff = {
        id: user.id,
        user_id: user.id,
        name: user.email?.split('@')[0] || 'Owner',
        email: user.email,
        role: userOrg.role || 'owner',
        is_active: true,
        phone: null,
        position: 'Owner',
        last_login_at: new Date().toISOString(),
        created_at: userOrg.created_at || new Date().toISOString()
      }

      // Combine owner and staff
      const allStaff = [currentUserStaff]
      
      // Add other staff members
      if (staffDetails && staffDetails.length > 0) {
        const otherStaff = staffDetails
          .filter((s: any) => s.user_id !== user.id) // Don't duplicate the owner
          .map((staff: any) => ({
            id: staff.id,
            user_id: staff.user_id,
            name: staff.email?.split('@')[0] || 'Staff Member',
            email: staff.email,
            phone: staff.phone_number,
            role: staff.role || 'staff',
            is_active: staff.is_available !== false,
            position: staff.role || 'Staff',
            last_login_at: staff.updated_at || staff.created_at,
            created_at: staff.created_at
          }))
        allStaff.push(...otherStaff)
      }

      setStaff(allStaff)
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    setInviteDialogOpen(false)
    fetchStaff()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading staff...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="My Staff"
        description="Manage team members and their permissions"
        action={
          <button
            onClick={() => setInviteDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Invite Staff
          </button>
        }
      />
      
      <StaffTable staff={staff} onUpdate={fetchStaff} />
      
      <InviteStaffDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}