'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Trash2, 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  CreditCard,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  name: string
  email: string
  phone?: string
  membership_plan?: {
    id: string
    name: string
    price_pennies: number
    currency: string
    billing_cycle: string
  }
  membership_status: 'active' | 'paused' | 'cancelled'
  membership_type: string
  start_date: string
  end_date?: string
  total_revenue: number
  created_at: string
  updated_at: string
}

interface MembershipPlan {
  id: string
  name: string
  price_pennies: number
  currency: string
  billing_cycle: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadMembers()
    loadMembershipPlans()
  }, [page, search, statusFilter, sortBy, sortOrder])

  const loadMembers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50', // Increase limit to show more members
        sort: sortBy,
        order: sortOrder,
      })

      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== '') params.append('membership_status', statusFilter)

      const response = await fetch(`/api/clients?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Members data:', data) // Debug logging
        setMembers(data.clients || [])
      } else {
        console.error('Failed to load members:', response.status, response.statusText)
        toast.error('Failed to load members')
      }
    } catch (error) {
      console.error('Error loading members:', error)
      toast.error('Error loading members')
    } finally {
      setLoading(false)
    }
  }

  const loadMembershipPlans = async () => {
    try {
      const response = await fetch('/api/membership-plans')
      if (response.ok) {
        const data = await response.json()
        setMembershipPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error loading membership plans:', error)
    }
  }

  const formatPrice = (pricePennies: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pricePennies / 100)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    }

    return (
      <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleCreateMember = () => {
    setEditingMember(null)
    setShowCreateDialog(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setShowCreateDialog(true)
  }

  const handleViewMember = (member: Member) => {
    window.location.href = `/members/${member.id}`
  }

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to delete ${member.name}? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${member.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Member deleted successfully')
        loadMembers()
      } else {
        toast.error('Failed to delete member')
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      toast.error('Error deleting member')
    }
  }

  const handleSaveMember = async (memberData: any) => {
    try {
      const isNew = !editingMember
      const url = isNew ? '/api/clients' : `/api/clients/${editingMember?.id}`

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      })

      if (response.ok) {
        toast.success(isNew ? 'Member created successfully' : 'Member updated successfully')
        setShowCreateDialog(false)
        setEditingMember(null)
        loadMembers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save member')
      }
    } catch (error) {
      console.error('Error saving member:', error)
      toast.error('Error saving member')
    }
  }

  // Calculate counts based on actual data
  const totalMembers = members.length
  const activeMembers = members.filter(m => m.membership_status === 'active').length
  const pausedMembers = members.filter(m => m.membership_status === 'paused').length
  const cancelledMembers = members.filter(m => m.membership_status === 'cancelled').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
              <p className="text-gray-600">Manage your active gym members and their memberships</p>
            </div>
            <Button onClick={handleCreateMember}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <UserPlus className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{activeMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Paused</p>
                    <p className="text-2xl font-bold text-gray-900">{pausedMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Cancelled</p>
                    <p className="text-2xl font-bold text-gray-900">{cancelledMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Members ({totalMembers})</CardTitle>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Members</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th 
                        className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Membership</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Revenue</th>
                      <th 
                        className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('start_date')}
                      >
                        <div className="flex items-center">
                          Start Date
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-4 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : members.length ? (
                      members.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{member.name}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3 h-3 mr-1" />
                                {member.email}
                              </div>
                              {member.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {member.membership_plan ? (
                              <div>
                                <div className="font-medium text-gray-900">{member.membership_plan.name}</div>
                                <div className="text-sm text-gray-500">
                                  {formatPrice(member.membership_plan.price_pennies)} / {member.membership_plan.billing_cycle}
                                </div>
                              </div>
                            ) : member.membership_type ? (
                              <div>
                                <div className="font-medium text-gray-900">{member.membership_type}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No plan assigned</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(member.membership_status)}
                          </td>
                          <td className="py-4 px-4 text-gray-900">
                            {formatPrice(member.total_revenue || 0)}
                          </td>
                          <td className="py-4 px-4 text-gray-700">
                            {member.start_date ? new Date(member.start_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewMember(member)}
                                className="p-1"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMember(member)}
                                className="p-1"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMember(member)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                          {search || statusFilter ? (
                            <>No members found matching your criteria. <Button variant="link" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</Button></>
                          ) : (
                            <>No members in your organization yet. <Button variant="link" onClick={handleCreateMember}>Create your first member</Button></>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <MemberDialog
            isOpen={showCreateDialog}
            onClose={() => {
              setShowCreateDialog(false)
              setEditingMember(null)
            }}
            member={editingMember}
            membershipPlans={membershipPlans}
            onSave={handleSaveMember}
          />

          {/* Warnings */}
          {membershipPlans.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You haven&apos;t created any membership plans yet. 
                <Button variant="link" className="p-0 h-auto font-normal" onClick={() => window.location.href = '/dashboard/settings/membership-plans'}>
                  Create membership plans
                </Button> to assign to members.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}

function MemberDialog({ 
  isOpen, 
  onClose, 
  member, 
  membershipPlans, 
  onSave 
}: { 
  isOpen: boolean
  onClose: () => void
  member: Member | null
  membershipPlans: MembershipPlan[]
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    membership_plan_id: '',
    membership_status: 'active',
    start_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        membership_plan_id: member.membership_plan?.id || '',
        membership_status: member.membership_status,
        start_date: member.start_date
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        membership_plan_id: '',
        membership_status: 'active',
        start_date: new Date().toISOString().split('T')[0]
      })
    }
  }, [member, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }

    // Transform form data for API
    const memberData = {
      ...formData,
      membership_type: membershipPlans.find(p => p.id === formData.membership_plan_id)?.name || 'Standard'
    }

    onSave(memberData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Member's full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="member@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="membership-plan">Membership Plan</Label>
            <Select
              value={formData.membership_plan_id}
              onValueChange={(value) => setFormData({ ...formData, membership_plan_id: value })}
            >
              <SelectTrigger id="membership-plan">
                <SelectValue placeholder="Select a membership plan" />
              </SelectTrigger>
              <SelectContent>
                {membershipPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: 'GBP',
                    }).format(plan.price_pennies / 100)} / {plan.billing_cycle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.membership_status}
              onValueChange={(value) => setFormData({ ...formData, membership_status: value as any })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {member ? 'Update Member' : 'Create Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}