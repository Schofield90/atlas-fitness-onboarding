'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import StaffCard from './StaffCard'
import StaffProfile from './StaffProfile'
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  MoreHorizontal,
  UserPlus,
  Download,
  Mail,
  Phone
} from 'lucide-react'
import { StaffProfile as StaffProfileType, StaffQueryParams } from '../../lib/types/staff'

interface StaffListProps {
  staff: StaffProfileType[]
  loading: boolean
  onRefresh: () => void
  onEdit: (staffId: string) => void
}

type ViewMode = 'table' | 'grid'
type SortField = 'first_name' | 'last_name' | 'position' | 'hire_date' | 'status'
type SortDirection = 'asc' | 'desc'

export default function StaffList({ staff, loading, onRefresh, onEdit }: StaffListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<StaffProfileType | null>(null)
  const [filteredStaff, setFilteredStaff] = useState<StaffProfileType[]>(staff)
  const [sortField, setSortField] = useState<SortField>('first_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [positionFilter, setPositionFilter] = useState<string>('')
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('')

  useEffect(() => {
    let filtered = staff

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.employee_id && member.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    // Apply department filter
    if (departmentFilter) {
      filtered = filtered.filter(member => member.department === departmentFilter)
    }

    // Apply position filter
    if (positionFilter) {
      filtered = filtered.filter(member => member.position === positionFilter)
    }

    // Apply employment type filter
    if (employmentTypeFilter) {
      filtered = filtered.filter(member => member.employment_type === employmentTypeFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'first_name':
          aValue = a.first_name.toLowerCase()
          bValue = b.first_name.toLowerCase()
          break
        case 'last_name':
          aValue = a.last_name.toLowerCase()
          bValue = b.last_name.toLowerCase()
          break
        case 'position':
          aValue = a.position.toLowerCase()
          bValue = b.position.toLowerCase()
          break
        case 'hire_date':
          aValue = new Date(a.hire_date)
          bValue = new Date(b.hire_date)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = a.first_name.toLowerCase()
          bValue = b.first_name.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredStaff(filtered)
  }, [staff, searchQuery, statusFilter, departmentFilter, positionFilter, employmentTypeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setDepartmentFilter('')
    setPositionFilter('')
    setEmploymentTypeFilter('')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'success' as const },
      inactive: { label: 'Inactive', variant: 'secondary' as const },
      terminated: { label: 'Terminated', variant: 'destructive' as const },
      on_leave: { label: 'On Leave', variant: 'warning' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getEmploymentTypeBadge = (type: string) => {
    const typeConfig = {
      full_time: { label: 'Full Time', variant: 'default' as const },
      part_time: { label: 'Part Time', variant: 'secondary' as const },
      contract: { label: 'Contract', variant: 'outline' as const },
      intern: { label: 'Intern', variant: 'secondary' as const }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.full_time
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getUniqueValues = (field: keyof StaffProfileType) => {
    return Array.from(new Set(staff.map(member => member[field]).filter(Boolean)))
  }

  if (loading) {
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
              <CardTitle>Staff Directory</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {filteredStaff.length} of {staff.length} staff members
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
              
              <div className="flex bg-slate-800 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="px-3 py-1"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-3 py-1"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
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
                placeholder="Search staff by name, email, position, or employee ID..."
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
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Departments</option>
                      {getUniqueValues('department').map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                    <select
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Positions</option>
                      {getUniqueValues('position').map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Employment Type</label>
                    <select
                      value={employmentTypeFilter}
                      onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">All Types</option>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    Showing {filteredStaff.length} results
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12 px-6">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No staff members found</h3>
              <p className="text-gray-400 mb-4">
                {searchQuery || statusFilter || departmentFilter || positionFilter || employmentTypeFilter
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by adding your first staff member.'}
              </p>
              {!(searchQuery || statusFilter || departmentFilter || positionFilter || employmentTypeFilter) && (
                <Button className="flex items-center gap-2 mx-auto">
                  <UserPlus className="h-4 w-4" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  staff={member}
                  onEdit={() => onEdit(member.id)}
                  onView={() => setSelectedStaff(member)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-300">
                      <button
                        onClick={() => handleSort('first_name')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        Name
                        {sortField === 'first_name' && (
                          <span className="text-orange-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-300">
                      <button
                        onClick={() => handleSort('position')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        Position
                        {sortField === 'position' && (
                          <span className="text-orange-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-300">Department</th>
                    <th className="text-left p-4 font-medium text-gray-300">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        Status
                        {sortField === 'status' && (
                          <span className="text-orange-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-300">Employment</th>
                    <th className="text-left p-4 font-medium text-gray-300">
                      <button
                        onClick={() => handleSort('hire_date')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        Hire Date
                        {sortField === 'hire_date' && (
                          <span className="text-orange-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-300">Contact</th>
                    <th className="text-right p-4 font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-gray-400">{member.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">{member.position}</td>
                      <td className="p-4 text-gray-300">{member.department || '-'}</td>
                      <td className="p-4">{getStatusBadge(member.status)}</td>
                      <td className="p-4">{getEmploymentTypeBadge(member.employment_type)}</td>
                      <td className="p-4 text-gray-300">
                        {new Date(member.hire_date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-gray-400 hover:text-orange-400"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {member.phone_number && (
                            <a
                              href={`tel:${member.phone_number}`}
                              className="text-gray-400 hover:text-orange-400"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStaff(member)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(member.id)}
                          >
                            Edit
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

      {/* Staff Profile Modal */}
      {selectedStaff && (
        <StaffProfile
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onEdit={() => {
            onEdit(selectedStaff.id)
            setSelectedStaff(null)
          }}
        />
      )}
    </>
  )
}