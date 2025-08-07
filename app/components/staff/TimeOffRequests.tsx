'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Plus, 
  Calendar, 
  Search, 
  Filter,
  Check,
  X,
  Clock,
  AlertCircle,
  FileText,
  User,
  MoreHorizontal
} from 'lucide-react'
import { 
  TimeOffRequest, 
  CreateTimeOffRequest, 
  TimeOffListResponse,
  StaffProfile 
} from '../../lib/types/staff'

interface TimeOffRequestsProps {
  onRequestUpdate: () => void
}

export default function TimeOffRequests({ onRequestUpdate }: TimeOffRequestsProps) {
  const [requests, setRequests] = useState<(TimeOffRequest & { staff_profile?: StaffProfile })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [staffFilter, setStaffFilter] = useState<string>('')
  
  // Form states
  const [availableStaff, setAvailableStaff] = useState<StaffProfile[]>([])
  const [formData, setFormData] = useState<CreateTimeOffRequest & { staff_id: string }>({
    staff_id: '',
    type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchTimeOffRequests()
    fetchAvailableStaff()
  }, [statusFilter, typeFilter, staffFilter])

  const fetchTimeOffRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: '50',
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(staffFilter && { staff_id: staffFilter }),
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/staff/time-off?${params}`)
      const data: TimeOffListResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch time off requests')
      }

      setRequests(data.data || [])
      
    } catch (err: any) {
      console.error('Error fetching time off requests:', err)
      setError(err.message || 'Failed to fetch time off requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableStaff = async () => {
    try {
      const response = await fetch('/api/staff?status=active&limit=100')
      const data = await response.json()
      
      if (data.success) {
        setAvailableStaff(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching staff:', err)
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.staff_id || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    setFormLoading(true)

    try {
      const response = await fetch('/api/staff/time-off', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create time off request')
      }

      setShowCreateForm(false)
      setFormData({
        staff_id: '',
        type: 'vacation',
        start_date: '',
        end_date: '',
        reason: ''
      })
      await fetchTimeOffRequests()
      onRequestUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to create time off request')
    } finally {
      setFormLoading(false)
    }
  }

  const handleApprovalAction = async (requestId: string, action: 'approved' | 'denied', notes?: string) => {
    try {
      const response = await fetch(`/api/staff/time-off/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: action,
          approval_notes: notes
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} request`)
      }

      await fetchTimeOffRequests()
      onRequestUpdate()
    } catch (err: any) {
      alert(err.message || `Failed to ${action} request`)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
      approved: { label: 'Approved', variant: 'success' as const, icon: Check },
      denied: { label: 'Denied', variant: 'destructive' as const, icon: X },
      cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: X }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      vacation: 'Vacation',
      sick: 'Sick Leave',
      personal: 'Personal',
      bereavement: 'Bereavement',
      maternity: 'Maternity',
      paternity: 'Paternity',
      unpaid: 'Unpaid Leave'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  if (loading && requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Time Off Requests</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {requests.length} total requests
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              
              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by staff name or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {showFilters && (
              <div className="p-4 bg-slate-800 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Types</option>
                      <option value="vacation">Vacation</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal</option>
                      <option value="bereavement">Bereavement</option>
                      <option value="maternity">Maternity</option>
                      <option value="paternity">Paternity</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Staff Member</label>
                    <select
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Staff</option>
                      {availableStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    Showing {requests.length} results
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('')
                      setTypeFilter('')
                      setStaffFilter('')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-6 border-b border-slate-700">
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No time off requests found</h3>
              <p className="text-gray-400 mb-4">
                Time off requests will appear here when submitted by staff.
              </p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Request
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-300">Staff Member</th>
                    <th className="text-left p-4 font-medium text-gray-300">Type</th>
                    <th className="text-left p-4 font-medium text-gray-300">Dates</th>
                    <th className="text-left p-4 font-medium text-gray-300">Days</th>
                    <th className="text-left p-4 font-medium text-gray-300">Reason</th>
                    <th className="text-left p-4 font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 font-medium text-gray-300">Submitted</th>
                    <th className="text-right p-4 font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-800/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {request.staff_profile?.first_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {request.staff_profile 
                                ? `${request.staff_profile.first_name} ${request.staff_profile.last_name}`
                                : 'Unknown Staff'
                              }
                            </div>
                            {request.staff_profile?.position && (
                              <div className="text-sm text-gray-400">{request.staff_profile.position}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="text-sm">
                          <div>{new Date(request.start_date).toLocaleDateString()}</div>
                          <div className="text-gray-400">to</div>
                          <div>{new Date(request.end_date).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="font-medium">
                          {calculateDays(request.start_date, request.end_date)} day{calculateDays(request.start_date, request.end_date) !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300 max-w-xs">
                        <div className="truncate" title={request.reason || 'No reason provided'}>
                          {request.reason || '-'}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(request.status)}</td>
                      <td className="p-4 text-gray-300">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovalAction(request.id, 'approved')}
                                className="flex items-center gap-1 text-green-400 hover:text-green-300"
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovalAction(request.id, 'denied')}
                                className="flex items-center gap-1 text-red-400 hover:text-red-300"
                              >
                                <X className="h-3 w-3" />
                                Deny
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                            className="p-2"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Request Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">New Time Off Request</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Staff Member *
                  </label>
                  <select
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">Select staff member</option>
                    {availableStaff.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  >
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal</option>
                    <option value="bereavement">Bereavement</option>
                    <option value="maternity">Maternity</option>
                    <option value="paternity">Paternity</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for time off..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={formLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}