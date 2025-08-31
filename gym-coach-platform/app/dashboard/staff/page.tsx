'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  UserCog,
  Plus,
  Search,
  Mail,
  Phone,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Calendar,
  Clock,
  Send,
  X,
  Check,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'trainer' | 'receptionist' | 'manager'
  status: 'active' | 'inactive' | 'pending'
  avatar?: string
  joinedDate: string
  lastActive: string
  permissions: string[]
}

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])

  // Mock data - in production this would come from API
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@atlasfitness.com',
      phone: '+44 7700 900123',
      role: 'admin',
      status: 'active',
      joinedDate: '2023-01-15',
      lastActive: '2 hours ago',
      permissions: ['all']
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@atlasfitness.com',
      phone: '+44 7700 900456',
      role: 'trainer',
      status: 'active',
      joinedDate: '2023-03-20',
      lastActive: '1 day ago',
      permissions: ['clients', 'calendar', 'messages']
    },
    {
      id: '3',
      name: 'Mike Williams',
      email: 'mike.w@atlasfitness.com',
      phone: '+44 7700 900789',
      role: 'receptionist',
      status: 'inactive',
      joinedDate: '2023-06-10',
      lastActive: '1 week ago',
      permissions: ['clients', 'calendar']
    }
  ])

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'trainer' as const,
    message: ''
  })

  const handleDeleteStaff = (staffId: string) => {
    setStaffMembers(members => members.filter(m => m.id !== staffId))
  }

  const handleToggleStatus = (staffId: string) => {
    setStaffMembers(members =>
      members.map(m =>
        m.id === staffId
          ? { ...m, status: m.status === 'active' ? 'inactive' as const : 'active' as const }
          : m
      )
    )
  }

  const handleSaveStaff = (data: Partial<StaffMember>) => {
    if (editingStaff) {
      setStaffMembers(members =>
        members.map(m =>
          m.id === editingStaff.id ? { ...m, ...data } : m
        )
      )
    } else {
      const newMember: StaffMember = {
        id: Date.now().toString(),
        name: data.name || 'New Staff',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'trainer',
        status: 'pending',
        joinedDate: new Date().toISOString().split('T')[0],
        lastActive: 'Never',
        permissions: []
      }
      setStaffMembers([...staffMembers, newMember])
    }
    setShowAddModal(false)
    setEditingStaff(null)
  }

  const handleSendInvite = () => {
    // In production, this would send an actual invite
    const newMember: StaffMember = {
      id: Date.now().toString(),
      name: 'Pending',
      email: inviteData.email,
      phone: '',
      role: inviteData.role,
      status: 'pending',
      joinedDate: new Date().toISOString().split('T')[0],
      lastActive: 'Never',
      permissions: []
    }
    setStaffMembers([...staffMembers, newMember])
    setShowInviteModal(false)
    setInviteData({ email: '', role: 'trainer', message: '' })
  }

  const filteredStaff = staffMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'trainer': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <p className="text-gray-600">Manage your team members and their permissions</p>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search staff by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInviteModal(true)}>
            <Send className="h-4 w-4 mr-2" />
            Invite Staff
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? 'Try adjusting your search criteria' 
              : 'Add your first team member to get started'}
          </p>
          {!searchQuery && (
            <div className="flex justify-center gap-2">
              <Button onClick={() => setShowInviteModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      <Badge 
                        variant={member.status === 'active' ? 'default' : 
                                member.status === 'pending' ? 'secondary' : 'outline'}
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{member.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {new Date(member.joinedDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>Active {member.lastActive}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingStaff(member)
                    setShowAddModal(true)
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleStatus(member.id)}
                >
                  {member.status === 'active' ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Enable
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteStaff(member.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name</label>
                <Input 
                  placeholder="John Smith" 
                  defaultValue={editingStaff?.name}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input 
                  type="email"
                  placeholder="john@atlasfitness.com" 
                  defaultValue={editingStaff?.email}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input 
                  type="tel"
                  placeholder="+44 7700 900000" 
                  defaultValue={editingStaff?.phone}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  defaultValue={editingStaff?.role || 'trainer'}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="trainer">Trainer</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Permissions</label>
                <div className="space-y-2">
                  {['Dashboard', 'Clients', 'Calendar', 'Messages', 'Reports', 'Settings'].map(perm => (
                    <label key={perm} className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddModal(false)
                  setEditingStaff(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSaveStaff({
                name: 'New Staff Member',
                email: 'staff@atlasfitness.com',
                role: 'trainer'
              })}>
                {editingStaff ? 'Save Changes' : 'Add Staff'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Invite Staff Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email Address</label>
                <Input 
                  type="email"
                  placeholder="Enter email address" 
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({...inviteData, role: e.target.value as any})}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="trainer">Trainer</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Personal Message (Optional)</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={4}
                  placeholder="Add a personal welcome message..."
                  value={inviteData.message}
                  onChange={(e) => setInviteData({...inviteData, message: e.target.value})}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Invitation will include:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Link to set up their account</li>
                      <li>Temporary password</li>
                      <li>Their assigned role and permissions</li>
                      <li>Getting started guide</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({ email: '', role: 'trainer', message: '' })
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendInvite}
                disabled={!inviteData.email}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}