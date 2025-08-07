'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  Users,
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react'
import { StaffProfile } from '../../lib/types/staff'

interface Shift {
  id: string
  staff_id: string
  staff_name: string
  staff_position: string
  date: string
  start_time: string
  end_time: string
  location?: string
  notes?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
}

interface ShiftScheduleProps {
  staff: StaffProfile[]
  onScheduleUpdate: () => void
}

type ViewMode = 'week' | 'month'

export default function ShiftSchedule({ staff, onScheduleUpdate }: ShiftScheduleProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [staffFilter, setStaffFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  // Form states
  const [formData, setFormData] = useState({
    staff_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    // Generate mock shift data for demonstration
    generateMockShifts()
  }, [currentDate, staffFilter, statusFilter])

  const generateMockShifts = () => {
    // This would normally fetch from API
    const mockShifts: Shift[] = []
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week

    for (let i = 0; i < 7; i++) {
      const shiftDate = new Date(startDate)
      shiftDate.setDate(startDate.getDate() + i)
      
      // Add some random shifts for demonstration
      if (Math.random() > 0.3) { // 70% chance of having shifts
        const numShifts = Math.floor(Math.random() * 3) + 1
        
        for (let j = 0; j < numShifts; j++) {
          const randomStaff = staff[Math.floor(Math.random() * staff.length)]
          if (randomStaff) {
            const startHour = 9 + j * 4
            const endHour = startHour + 4
            
            mockShifts.push({
              id: `shift-${i}-${j}`,
              staff_id: randomStaff.id,
              staff_name: `${randomStaff.first_name} ${randomStaff.last_name}`,
              staff_position: randomStaff.position,
              date: shiftDate.toISOString().split('T')[0],
              start_time: `${startHour.toString().padStart(2, '0')}:00`,
              end_time: `${endHour.toString().padStart(2, '0')}:00`,
              location: ['Main Gym', 'Studio 1', 'Reception', 'Pool Area'][Math.floor(Math.random() * 4)],
              notes: Math.random() > 0.7 ? 'Special training session' : undefined,
              status: ['scheduled', 'confirmed', 'completed'][Math.floor(Math.random() * 3)] as any
            })
          }
        }
      }
    }
    
    setShifts(mockShifts)
    setLoading(false)
  }

  const getWeekDays = () => {
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week (Sunday)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.filter(shift => shift.date === dateStr)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', variant: 'secondary' as const },
      confirmed: { label: 'Confirmed', variant: 'warning' as const },
      completed: { label: 'Completed', variant: 'success' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatTime = (time: string) => {
    return time
  }

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault()
    // This would normally send to API
    console.log('Creating shift:', formData)
    setShowCreateForm(false)
    setFormData({
      staff_id: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      notes: ''
    })
    onScheduleUpdate()
  }

  const weekDays = getWeekDays()

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Staff Schedule</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Manage shifts and staff scheduling
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
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="px-3 py-1"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="px-3 py-1"
                >
                  Month
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 bg-slate-800 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Staff Member</label>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Staff</option>
                    {staff.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="text-lg font-semibold text-white">
              {viewMode === 'week' 
                ? `Week of ${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
              }
            </h3>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : viewMode === 'week' ? (
            // Week View
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-px bg-slate-700">
                  {weekDays.map((day, index) => (
                    <div key={index} className="bg-slate-800 p-3 text-center">
                      <div className="text-sm font-medium text-gray-300">
                        {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold text-white">
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-slate-700 min-h-[600px]">
                  {weekDays.map((day, index) => {
                    const dayShifts = getShiftsForDate(day)
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <div 
                        key={index} 
                        className={`bg-slate-900 p-2 min-h-[200px] ${isToday ? 'ring-2 ring-orange-500' : ''}`}
                      >
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className="p-2 bg-slate-800 rounded text-xs border-l-2 border-orange-500 hover:bg-slate-700 cursor-pointer"
                              onClick={() => setSelectedShift(shift)}
                            >
                              <div className="font-medium text-white truncate">
                                {shift.staff_name}
                              </div>
                              <div className="text-gray-400">
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              </div>
                              <div className="text-gray-400 truncate">
                                {shift.location}
                              </div>
                              <div className="mt-1">
                                {getStatusBadge(shift.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Month View - Simplified for now
            <div className="p-6">
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Month view coming soon...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Shift Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Shift</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="p-2"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>
              
              <form onSubmit={handleCreateShift} className="space-y-4">
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
                    {staff.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} - {member.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Main Gym, Studio 1, Reception"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Shift
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Shift Details</h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedShift(null)}
                  className="p-2"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Staff Member</label>
                  <p className="text-white font-medium">{selectedShift.staff_name}</p>
                  <p className="text-sm text-gray-400">{selectedShift.staff_position}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Date</label>
                    <p className="text-white font-medium">
                      {new Date(selectedShift.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Time</label>
                    <p className="text-white font-medium">
                      {selectedShift.start_time} - {selectedShift.end_time}
                    </p>
                  </div>
                </div>

                {selectedShift.location && (
                  <div>
                    <label className="text-sm text-gray-400">Location</label>
                    <p className="text-white font-medium">{selectedShift.location}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedShift.status)}
                  </div>
                </div>

                {selectedShift.notes && (
                  <div>
                    <label className="text-sm text-gray-400">Notes</label>
                    <p className="text-gray-300">{selectedShift.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}