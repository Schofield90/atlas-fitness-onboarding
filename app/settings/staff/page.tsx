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

      // Get all staff members in the organization
      const { data: staffData } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })

      // Also get staff details from organization_staff if it exists
      const { data: staffDetails } = await supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', userOrg.organization_id)

      // Merge the data
      const mergedStaff = staffData?.map((member: any) => {
        const details = staffDetails?.find((d: any) => d.user_id === member.user_id)
        return {
          ...member,
          id: member.user_id, // Use user_id as the id
          name: details?.name || 'Staff Member',
          avatar_url: details?.avatar_url,
          phone: details?.phone,
          position: details?.position,
          email: details?.email || 'No email',
          last_login_at: member.updated_at, // Use updated_at as a proxy for last login
          created_at: member.created_at
        }
      }) || []

      setStaff(mergedStaff)
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