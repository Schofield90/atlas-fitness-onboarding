'use client'

import { useState } from 'react'
import { MoreVertical, Shield, Check, X, Mail, Phone } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import { createClient } from '@/app/lib/supabase/client'

interface StaffTableProps {
  staff: any[]
  onUpdate: () => void
}

export default function StaffTable({ staff, onUpdate }: StaffTableProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const supabase = createClient()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-600'
      case 'admin':
        return 'bg-blue-600'
      case 'staff':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  const formatLastLogin = (date: string | null) => {
    if (!date) return 'Never'
    
    const lastLogin = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 48) return 'Yesterday'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return formatBritishDateTime(date)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_organizations')
        .update({ role: newRole })
        .eq('user_id', userId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_organizations')
        .update({ is_active: !isActive })
        .eq('user_id', userId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error toggling active status:', error)
    }
  }

  const handleRemoveAccess = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this staff member\'s access?')) return

    try {
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error removing access:', error)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Staff Member
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last Active
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-gray-750">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-300">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-white">{member.name}</div>
                    {member.position && (
                      <div className="text-sm text-gray-400">{member.position}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="h-3 w-3" />
                      {member.phone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(member.role)}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {member.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1 text-sm ${member.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                  {member.is_active ? (
                    <>
                      <Check className="h-4 w-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Inactive
                    </>
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {formatLastLogin(member.last_login_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                  
                  {menuOpen === member.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg py-1 z-10">
                      <button
                        onClick={() => {
                          handleToggleActive(member.user_id, member.is_active)
                          setMenuOpen(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      {member.role !== 'owner' && (
                        <>
                          <div className="border-t border-gray-600 my-1"></div>
                          <button
                            onClick={() => {
                              handleRoleChange(member.user_id, member.role === 'admin' ? 'staff' : 'admin')
                              setMenuOpen(null)
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                          >
                            Change to {member.role === 'admin' ? 'Staff' : 'Admin'}
                          </button>
                        </>
                      )}
                      
                      {member.role !== 'owner' && (
                        <>
                          <div className="border-t border-gray-600 my-1"></div>
                          <button
                            onClick={() => {
                              handleRemoveAccess(member.user_id)
                              setMenuOpen(null)
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                          >
                            Remove Access
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}