'use client'

import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Clock, 
  MapPin, 
  User, 
  Play, 
  Square, 
  Coffee,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { TimesheetEntry, ClockInRequest, ClockOutRequest } from '../../lib/types/staff'

interface ClockInOutProps {
  onClockAction: () => void
  staffId?: string // Optional - if not provided, will allow selecting staff member
}

interface ActiveTimesheet {
  id: string
  staff_id: string
  staff_name: string
  clock_in: string
  break_start?: string
  break_end?: string
  location_clock_in?: string
  notes?: string
}

export default function ClockInOut({ onClockAction, staffId }: ClockInOutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTimesheet, setActiveTimesheet] = useState<ActiveTimesheet | null>(null)
  const [availableStaff, setAvailableStaff] = useState<any[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffId || '')
  const [location, setLocation] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [onBreak, setOnBreak] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!staffId) {
      fetchAvailableStaff()
    }
    fetchActiveTimesheet()
  }, [staffId, selectedStaffId])

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

  const fetchActiveTimesheet = async () => {
    try {
      const staffIdToUse = staffId || selectedStaffId
      if (!staffIdToUse) return

      const response = await fetch(`/api/staff/timesheets?staff_id=${staffIdToUse}&status=active`)
      const data = await response.json()
      
      if (data.success && data.data && data.data.length > 0) {
        const timesheet = data.data[0]
        const staff = availableStaff.find(s => s.id === timesheet.staff_id)
        
        setActiveTimesheet({
          id: timesheet.id,
          staff_id: timesheet.staff_id,
          staff_name: staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown',
          clock_in: timesheet.clock_in,
          break_start: timesheet.break_start,
          break_end: timesheet.break_end,
          location_clock_in: timesheet.location_clock_in,
          notes: timesheet.notes
        })
        
        setOnBreak(!!timesheet.break_start && !timesheet.break_end)
      } else {
        setActiveTimesheet(null)
      }
    } catch (err) {
      console.error('Error fetching active timesheet:', err)
    }
  }

  const handleClockIn = async () => {
    if (!selectedStaffId && !staffId) {
      setError('Please select a staff member')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const requestData: ClockInRequest = {
        staff_id: staffId || selectedStaffId,
        location: location || undefined,
        notes: notes || undefined
      }

      const response = await fetch('/api/staff/timesheets/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to clock in')
      }

      setSuccess('Successfully clocked in!')
      setNotes('')
      await fetchActiveTimesheet()
      onClockAction()
    } catch (err: any) {
      setError(err.message || 'Failed to clock in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeTimesheet) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const requestData: ClockOutRequest = {
        staff_id: activeTimesheet.staff_id,
        location: location || undefined,
        notes: notes || undefined
      }

      const response = await fetch('/api/staff/timesheets/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to clock out')
      }

      setSuccess('Successfully clocked out!')
      setNotes('')
      setActiveTimesheet(null)
      setOnBreak(false)
      onClockAction()
    } catch (err: any) {
      setError(err.message || 'Failed to clock out')
    } finally {
      setLoading(false)
    }
  }

  const handleBreakToggle = async () => {
    if (!activeTimesheet) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const endpoint = onBreak 
        ? `/api/staff/timesheets/${activeTimesheet.id}/break-end`
        : `/api/staff/timesheets/${activeTimesheet.id}/break-start`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || `Failed to ${onBreak ? 'end' : 'start'} break`)
      }

      setSuccess(`Break ${onBreak ? 'ended' : 'started'} successfully!`)
      setOnBreak(!onBreak)
      await fetchActiveTimesheet()
      onClockAction()
    } catch (err: any) {
      setError(err.message || `Failed to ${onBreak ? 'end' : 'start'} break`)
    } finally {
      setLoading(false)
    }
  }

  const getWorkDuration = () => {
    if (!activeTimesheet) return '0h 0m'
    
    const clockIn = new Date(activeTimesheet.clock_in)
    const now = new Date()
    let diffMs = now.getTime() - clockIn.getTime()
    
    // Subtract break time if applicable
    if (activeTimesheet.break_start) {
      const breakStart = new Date(activeTimesheet.break_start)
      const breakEnd = activeTimesheet.break_end ? new Date(activeTimesheet.break_end) : now
      const breakDuration = breakEnd.getTime() - breakStart.getTime()
      diffMs -= breakDuration
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-4">
      {/* Current Time Display */}
      <div className="text-center p-4 bg-slate-800 rounded-lg">
        <div className="text-2xl font-mono text-white">
          {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
        </div>
        <div className="text-sm text-gray-400">
          {currentTime.toLocaleDateString('en-GB', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Status */}
      {activeTimesheet ? (
        <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Clocked In
              </Badge>
              {onBreak && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Coffee className="h-3 w-3" />
                  On Break
                </Badge>
              )}
            </div>
            <div className="text-green-300 font-mono text-lg">
              {getWorkDuration()}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              <span className="text-gray-400">Staff:</span> {activeTimesheet.staff_name}
            </p>
            <p className="text-gray-300">
              <span className="text-gray-400">Clock In:</span> {
                new Date(activeTimesheet.clock_in).toLocaleTimeString('en-GB', { hour12: false })
              }
            </p>
            {activeTimesheet.location_clock_in && (
              <p className="text-gray-300">
                <span className="text-gray-400">Location:</span> {activeTimesheet.location_clock_in}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Not clocked in</span>
          </div>
        </div>
      )}

      {/* Staff Selection (if not fixed) */}
      {!staffId && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Select Staff Member
          </label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            disabled={!!activeTimesheet}
          >
            <option value="">Choose staff member...</option>
            {availableStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name} - {staff.position}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Location Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MapPin className="h-4 w-4 inline mr-1" />
          Location (Optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Front Desk, Gym Floor, Reception"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Notes Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {activeTimesheet ? (
          <div className="space-y-2">
            {/* Break Button */}
            <Button
              variant="outline"
              onClick={handleBreakToggle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <Coffee className="h-4 w-4" />
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {onBreak ? 'Ending Break...' : 'Starting Break...'}
                </>
              ) : (
                <>{onBreak ? 'End Break' : 'Start Break'}</>
              )}
            </Button>

            {/* Clock Out Button */}
            <Button
              variant="destructive"
              onClick={handleClockOut}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <Square className="h-4 w-4" />
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Clocking Out...
                </>
              ) : (
                'Clock Out'
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleClockIn}
            disabled={loading || (!staffId && !selectedStaffId)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Clocking In...
              </>
            ) : (
              'Clock In'
            )}
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 text-center">
        {activeTimesheet ? (
          'Use the buttons above to manage your current work session.'
        ) : (
          'Select a staff member and click "Clock In" to start tracking time.'
        )}
      </div>
    </div>
  )
}