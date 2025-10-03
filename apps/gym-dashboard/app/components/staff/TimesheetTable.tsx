'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  Download,
  Edit,
  Check,
  X,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'
import { 
  TimesheetEntry, 
  TimesheetListResponse, 
  TimesheetQueryParams,
  StaffProfile 
} from '../../lib/types/staff'

interface TimesheetTableProps {
  onTimesheetUpdate: () => void
}

type SortField = 'clock_in' | 'clock_out' | 'total_hours' | 'total_pay' | 'staff_name'
type SortDirection = 'asc' | 'desc'

export default function TimesheetTable({ onTimesheetUpdate }: TimesheetTableProps) {
  const [timesheets, setTimesheets] = useState<(TimesheetEntry & { staff_profile?: StaffProfile })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTimesheet, setSelectedTimesheet] = useState<string | null>(null)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [staffFilter, setStaffFilter] = useState<string>('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('clock_in')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const itemsPerPage = 25

  useEffect(() => {
    fetchTimesheets()
  }, [currentPage, sortField, sortDirection, statusFilter, staffFilter, startDateFilter, endDateFilter])

  const fetchTimesheets = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort_field: sortField,
        sort_direction: sortDirection,
        ...(statusFilter && { status: statusFilter }),
        ...(staffFilter && { staff_id: staffFilter }),
        ...(startDateFilter && { start_date: startDateFilter }),
        ...(endDateFilter && { end_date: endDateFilter }),
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/staff/timesheets?${params}`)
      const data: TimesheetListResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch timesheets')
      }

      setTimesheets(data.data || [])
      setTotalRecords(data.total || 0)
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage))
      
    } catch (err: any) {
      console.error('Error fetching timesheets:', err)
      setError(err.message || 'Failed to fetch timesheets')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleApprove = async (timesheetId: string) => {
    try {
      const response = await fetch(`/api/staff/timesheets/${timesheetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          approved_at: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to approve timesheet')
      }

      await fetchTimesheets()
      onTimesheetUpdate()
    } catch (err: any) {
      console.error('Error approving timesheet:', err)
      alert(err.message || 'Failed to approve timesheet')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'warning' as const, icon: Clock },
      completed: { label: 'Completed', variant: 'success' as const, icon: Check },
      disputed: { label: 'Disputed', variant: 'destructive' as const, icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading && timesheets.length === 0) {
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Timesheets</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              {totalRecords} timesheet entries
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
              variant="outline"
              size="sm"
              onClick={() => fetchTimesheets()}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by staff name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {showFilters && (
            <div className="p-4 bg-slate-800 rounded-lg space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="disputed">Disputed</option>
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
                    {/* TODO: Populate with staff options */}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  Showing {timesheets.length} of {totalRecords} results
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('')
                    setStaffFilter('')
                    setStartDateFilter('')
                    setEndDateFilter('')
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

        {timesheets.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No timesheet entries found</h3>
            <p className="text-gray-400">
              Timesheet entries will appear here once staff start clocking in and out.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('staff_name')}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      Staff Member
                      {sortField === 'staff_name' && (
                        <span className="text-orange-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('clock_in')}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      Date
                      {sortField === 'clock_in' && (
                        <span className="text-orange-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-300">Clock In</th>
                  <th className="text-left p-4 font-medium text-gray-300">Clock Out</th>
                  <th className="text-left p-4 font-medium text-gray-300">Break</th>
                  <th className="text-left p-4 font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('total_hours')}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      Total Hours
                      {sortField === 'total_hours' && (
                        <span className="text-orange-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-300">
                    <button
                      onClick={() => handleSort('total_pay')}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      Total Pay
                      {sortField === 'total_pay' && (
                        <span className="text-orange-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-300">Status</th>
                  <th className="text-right p-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {timesheet.staff_profile?.first_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {timesheet.staff_profile 
                              ? `${timesheet.staff_profile.first_name} ${timesheet.staff_profile.last_name}`
                              : 'Unknown Staff'
                            }
                          </div>
                          {timesheet.staff_profile?.position && (
                            <div className="text-sm text-gray-400">{timesheet.staff_profile.position}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">
                      {formatDate(timesheet.clock_in)}
                    </td>
                    <td className="p-4 text-gray-300">
                      {formatTime(timesheet.clock_in)}
                    </td>
                    <td className="p-4 text-gray-300">
                      {timesheet.clock_out ? formatTime(timesheet.clock_out) : (
                        <Badge variant="warning">Active</Badge>
                      )}
                    </td>
                    <td className="p-4 text-gray-300">
                      {timesheet.break_duration ? formatDuration(timesheet.break_duration) : '-'}
                    </td>
                    <td className="p-4 text-gray-300">
                      {timesheet.total_hours ? `${timesheet.total_hours.toFixed(2)}h` : '-'}
                    </td>
                    <td className="p-4 text-gray-300">
                      {timesheet.total_pay ? `£${timesheet.total_pay.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-4">{getStatusBadge(timesheet.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {timesheet.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(timesheet.id)}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                        >
                          <Edit className="h-4 w-4" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {currentPage} of {totalPages} ({totalRecords} total entries)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}