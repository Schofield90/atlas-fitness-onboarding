'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, Users, MapPin, Plus, Settings, List, ArrowLeft, Repeat, CalendarDays } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import Link from 'next/link'
import AddRepeatingTimeSlotsModal from './AddRepeatingTimeSlotsModal'
import AddSingleSessionModal from './AddSingleSessionModal'
import SessionsListModal from './SessionsListModal'
import EditDetailsModal from './EditDetailsModal'
import EditDatesModal from './EditDatesModal'

interface ClassType {
  id: string
  name: string
  description?: string
  is_active: boolean
}

interface ClassSession {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number
  capacity: number
  location: string
  instructor_name: string
  bookings_count?: number
}

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [classType, setClassType] = useState<ClassType | null>(null)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'schedule' | 'sessions' | 'settings'>('schedule')
  const [showAddRepeatingModal, setShowAddRepeatingModal] = useState(false)
  const [showAddSingleModal, setShowAddSingleModal] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<any>(null)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false)
  const [showEditDatesModal, setShowEditDatesModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadClassType()
    loadSessions()
  }, [params.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.relative')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const loadClassType = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setClassType(data)
    } catch (error) {
      console.error('Error loading class type:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          bookings(count)
        `)
        .eq('program_id', params.id)
        .order('start_time', { ascending: true })

      if (error) throw error

      const transformedData = data?.map(session => ({
        ...session,
        bookings_count: session.bookings?.[0]?.count || 0
      })) || []

      setSessions(transformedData)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTimeSlot = async (pattern: ClassSession & { occurrences: number }) => {
    if (!confirm(`Are you sure you want to cancel all ${pattern.occurrences} sessions at this time slot?`)) {
      return
    }

    try {
      // Find all sessions matching this pattern
      const matchingSessions = sessions.filter(session => {
        const sessionDate = new Date(session.start_time)
        const sessionDayName = sessionDate.toLocaleDateString('en-GB', { weekday: 'long' })
        const sessionTime = sessionDate.toTimeString().slice(0, 5)
        const patternDate = new Date(pattern.start_time)
        const patternTime = patternDate.toTimeString().slice(0, 5)
        
        return sessionDayName === sessionDate.toLocaleDateString('en-GB', { weekday: 'long' }) &&
               sessionTime === patternTime &&
               session.instructor_name === pattern.instructor_name &&
               session.location === pattern.location &&
               session.capacity === pattern.capacity
      })

      // Delete all matching sessions
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .in('id', matchingSessions.map(s => s.id))

      if (error) throw error

      alert(`Successfully cancelled ${matchingSessions.length} sessions`)
      setOpenDropdown(null)
      loadSessions()
    } catch (error: any) {
      console.error('Error cancelling time slot:', error)
      alert('Failed to cancel time slot: ' + error.message)
    }
  }

  // Group sessions by recurring pattern (day of week + time)
  const recurringPatterns = sessions.reduce((acc, session) => {
    const date = new Date(session.start_time)
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const timeKey = date.toTimeString().slice(0, 5) // HH:MM format
    const patternKey = `${dayName}-${timeKey}-${session.duration_minutes}-${session.instructor_name}-${session.location}-${session.capacity}`
    
    if (!acc[dayName]) acc[dayName] = {}
    if (!acc[dayName][patternKey]) {
      acc[dayName][patternKey] = {
        ...session,
        occurrences: 1
      }
    } else {
      acc[dayName][patternKey].occurrences++
    }
    return acc
  }, {} as Record<string, Record<string, ClassSession & { occurrences: number }>>)

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (loading || !classType) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Navigation */}
        <div className="bg-white border-b">
          <div className="px-8 py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
              <span className="text-gray-400">/</span>
              <Link href="/classes" className="text-blue-600 hover:underline">Class Types</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900">{classType.name}</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Schedule</span>
            </nav>
          </div>
        </div>

        {/* Class Header */}
        <div className="bg-white border-b">
          <div className="px-8 py-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {classType.name} | Classes
                </h1>
                <p className="text-gray-600">
                  Visible to: everyone • <span className="text-blue-600">{sessions.length} sessions</span>
                </p>
                <p className="text-gray-600 mt-1">
                  {classType.description || 'No description provided'}
                </p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="px-8">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 ${
                  activeTab === 'schedule' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 ${
                  activeTab === 'sessions' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                Sessions
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 ${
                  activeTab === 'settings' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings & Pricing
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'schedule' && (
            <div>
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mb-6">
                <button 
                  onClick={() => setShowAddRepeatingModal(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Repeat className="h-4 w-4" />
                  Add repeating time slots
                </button>
                <button 
                  onClick={() => setShowAddSingleModal(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add single session
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Bulk Edit
                </button>
              </div>

              {/* Schedule by Day */}
              <div className="space-y-8">
                {daysOrder.map(day => {
                  const dayPatterns = recurringPatterns[day]
                  if (!dayPatterns || Object.keys(dayPatterns).length === 0) return null

                  return (
                    <div key={day}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{day}</h3>
                      <div className="space-y-3">
                        {Object.values(dayPatterns).map(pattern => {
                          const startTime = new Date(pattern.start_time)
                          const endTime = new Date(pattern.end_time)
                          
                          // Calculate if it's exactly 1 hour
                          const durationMinutes = pattern.duration_minutes
                          const isOneHour = durationMinutes === 60
                          
                          const timeDisplay = isOneHour 
                            ? `${startTime.toLocaleTimeString('en-GB', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })} • 1 hour`
                            : `${startTime.toLocaleTimeString('en-GB', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}–${endTime.toLocaleTimeString('en-GB', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}`

                          const dropdownKey = `${day}-${pattern.start_time}-${pattern.instructor_name}`
                          
                          return (
                            <div key={dropdownKey} className="bg-white border rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-gray-900 font-medium">
                                    {timeDisplay} @ {pattern.location}
                                  </p>
                                  <p className="text-gray-600">
                                    Limit: {pattern.capacity} • {pattern.instructor_name}
                                  </p>
                                </div>
                                <div className="relative">
                                  <button 
                                    onClick={() => setOpenDropdown(openDropdown === dropdownKey ? null : dropdownKey)}
                                    className="p-2 hover:bg-gray-100 rounded"
                                  >
                                    <Settings className="h-4 w-4 text-gray-600" />
                                  </button>
                                  
                                  {openDropdown === dropdownKey && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                      <div className="py-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedPattern(pattern)
                                            setShowSessionsModal(true)
                                            setOpenDropdown(null)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          <div className="font-medium">Sessions</div>
                                          <div className="text-gray-500 text-xs">at this time slot</div>
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedPattern(pattern)
                                            setShowEditDetailsModal(true)
                                            setOpenDropdown(null)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          <div className="font-medium">Edit Details</div>
                                          <div className="text-gray-500 text-xs">venue, instructors, time</div>
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedPattern(pattern)
                                            setShowEditDatesModal(true)
                                            setOpenDropdown(null)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          <div className="font-medium">Edit Dates</div>
                                          <div className="text-gray-500 text-xs">start, end, alignment</div>
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancelTimeSlot(pattern)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                          <div className="font-medium">Cancel</div>
                                          <div className="text-gray-500 text-xs">remove time slot</div>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {sessions.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No scheduled sessions</p>
                    <p className="text-gray-600 mb-4">Add time slots to start scheduling classes</p>
                    <button 
                      onClick={() => setShowAddRepeatingModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add repeating time slots
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-lg border p-6">
              <p className="text-gray-600">Sessions view coming soon...</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg border p-6">
              <p className="text-gray-600">Settings & Pricing coming soon...</p>
            </div>
          )}
        </div>

        {/* Add Repeating Time Slots Modal */}
        {showAddRepeatingModal && params.id && (
          <AddRepeatingTimeSlotsModal
            onClose={() => setShowAddRepeatingModal(false)}
            onSuccess={() => {
              setShowAddRepeatingModal(false)
              loadSessions() // Reload sessions after adding new ones
            }}
            programId={params.id as string}
          />
        )}

        {/* Add Single Session Modal */}
        {showAddSingleModal && params.id && (
          <AddSingleSessionModal
            onClose={() => setShowAddSingleModal(false)}
            onSuccess={() => {
              setShowAddSingleModal(false)
              loadSessions() // Reload sessions after adding new one
            }}
            programId={params.id as string}
          />
        )}

        {/* Sessions List Modal */}
        {showSessionsModal && selectedPattern && params.id && (
          <SessionsListModal
            onClose={() => setShowSessionsModal(false)}
            programId={params.id as string}
            dayOfWeek={new Date(selectedPattern.start_time).toLocaleDateString('en-GB', { weekday: 'long' })}
            timeSlot={new Date(selectedPattern.start_time).toTimeString().slice(0, 5)}
            instructor={selectedPattern.instructor_name}
            location={selectedPattern.location}
            capacity={selectedPattern.capacity}
          />
        )}

        {/* Edit Details Modal */}
        {showEditDetailsModal && selectedPattern && params.id && (
          <EditDetailsModal
            onClose={() => setShowEditDetailsModal(false)}
            onSuccess={() => {
              setShowEditDetailsModal(false)
              loadSessions()
            }}
            programId={params.id as string}
            dayOfWeek={new Date(selectedPattern.start_time).toLocaleDateString('en-GB', { weekday: 'long' })}
            currentTime={new Date(selectedPattern.start_time).toTimeString().slice(0, 5)}
            currentInstructor={selectedPattern.instructor_name}
            currentLocation={selectedPattern.location}
            currentCapacity={selectedPattern.capacity}
            currentDuration={selectedPattern.duration_minutes}
          />
        )}

        {/* Edit Dates Modal */}
        {showEditDatesModal && selectedPattern && params.id && (
          <EditDatesModal
            onClose={() => setShowEditDatesModal(false)}
            onSuccess={() => {
              setShowEditDatesModal(false)
              loadSessions()
            }}
            programId={params.id as string}
            dayOfWeek={new Date(selectedPattern.start_time).toLocaleDateString('en-GB', { weekday: 'long' })}
            timeSlot={new Date(selectedPattern.start_time).toTimeString().slice(0, 5)}
            instructor={selectedPattern.instructor_name}
            location={selectedPattern.location}
            capacity={selectedPattern.capacity}
          />
        )}
      </div>
    </DashboardLayout>
  )
}