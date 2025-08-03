'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X, Calendar, Users, Trash2 } from 'lucide-react'
import { formatBritishDate, formatBritishDateTime } from '@/app/lib/utils/british-format'

interface SessionsListModalProps {
  onClose: () => void
  programId: string
  dayOfWeek: string
  timeSlot: string
  instructor: string
  location: string
  capacity: number
}

interface Session {
  id: string
  start_time: string
  end_time: string
  capacity: number
  location: string
  instructor_name: string
  bookings?: { count: number }[]
}

export default function SessionsListModal({ 
  onClose, 
  programId, 
  dayOfWeek, 
  timeSlot, 
  instructor, 
  location,
  capacity 
}: SessionsListModalProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      // Get all sessions for this program
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          bookings(count)
        `)
        .eq('program_id', programId)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Filter to only show sessions matching this time slot pattern
      const filteredSessions = data?.filter(session => {
        const sessionDate = new Date(session.start_time)
        const sessionDayName = sessionDate.toLocaleDateString('en-GB', { weekday: 'long' })
        const sessionTime = sessionDate.toTimeString().slice(0, 5)
        
        return sessionDayName === dayOfWeek &&
               sessionTime === timeSlot &&
               session.instructor_name === instructor &&
               session.location === location &&
               session.capacity === capacity
      }) || []

      setSessions(filteredSessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      loadSessions()
    } catch (error: any) {
      alert('Failed to delete session: ' + error.message)
    }
  }

  // Get only future sessions
  const futureSessions = sessions.filter(s => new Date(s.start_time) >= new Date())
  const pastSessions = sessions.filter(s => new Date(s.start_time) < new Date())

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sessions at this time slot</h2>
            <p className="text-gray-600 mt-1">
              {dayOfWeek}s at {timeSlot} with {instructor} @ {location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {futureSessions.length === 0 && pastSessions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No sessions found for this time slot</p>
            ) : (
              <div className="space-y-6">
                {futureSessions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Upcoming Sessions ({futureSessions.length})
                    </h3>
                    <div className="space-y-2">
                      {futureSessions.map(session => {
                        const bookingsCount = session.bookings?.[0]?.count || 0
                        return (
                          <div key={session.id} className="border rounded-lg p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">
                                {formatBritishDate(session.start_time)}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(session.start_time).toLocaleTimeString('en-GB', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {bookingsCount}/{session.capacity} booked
                                </span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pastSessions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Past Sessions ({pastSessions.length})
                    </h3>
                    <div className="space-y-2 opacity-60">
                      {pastSessions.slice(0, 5).map(session => {
                        const bookingsCount = session.bookings?.[0]?.count || 0
                        return (
                          <div key={session.id} className="border rounded-lg p-4">
                            <p className="font-medium text-gray-900">
                              {formatBritishDate(session.start_time)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {bookingsCount} attendees
                            </p>
                          </div>
                        )
                      })}
                      {pastSessions.length > 5 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          ... and {pastSessions.length - 5} more past sessions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}