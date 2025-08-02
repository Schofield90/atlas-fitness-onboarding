'use client'

import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, Filter, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'

export default function ClientSchedulePage() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    location: 'all',
    classType: 'all',
    instructor: 'all'
  })
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (client) {
      loadSessions()
    }
  }, [weekStart, client])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/client-portal/login')
      return
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!clientData) {
      router.push('/client-portal/login')
      return
    }

    setClient(clientData)
    setLoading(false)
  }

  const loadSessions = async () => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    const { data } = await supabase
      .from('class_sessions')
      .select(`
        *,
        programs (
          name,
          description
        ),
        organization_locations (
          name,
          address
        ),
        organization_staff (
          name
        )
      `)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .eq('organization_id', client.organization_id)
      .order('start_time')

    setSessions(data || [])
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? addDays(weekStart, -7)
      : addDays(weekStart, 7)
    setWeekStart(newWeekStart)
    setSelectedDate(newWeekStart)
  }

  const getDaysOfWeek = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(parseISO(session.start_time), date)
    ).filter(session => {
      if (filters.location !== 'all' && session.location_id !== filters.location) return false
      if (filters.classType !== 'all' && session.program_id !== filters.classType) return false
      if (filters.instructor !== 'all' && session.instructor_id !== filters.instructor) return false
      return true
    })
  }

  const bookClass = async (sessionId: string) => {
    const response = await fetch('/api/booking/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        customerId: client.id,
        organizationId: client.organization_id
      })
    })

    if (response.ok) {
      router.push('/client/bookings')
    } else {
      const error = await response.json()
      alert(error.error || 'Failed to book class')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const daysOfWeek = getDaysOfWeek()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/client')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Class Schedule</h1>
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide">
            {daysOfWeek.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 min-w-[100px] py-4 px-4 text-center border-b-2 transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                <div className={`text-lg font-semibold ${
                  isSameDay(day, selectedDate) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classes List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {getSessionsForDay(selectedDate).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No classes scheduled for this day</p>
            </div>
          ) : (
            getSessionsForDay(selectedDate).map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.programs?.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          session.current_capacity >= session.max_capacity
                            ? 'bg-red-100 text-red-800'
                            : session.current_capacity > session.max_capacity * 0.8
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {session.current_capacity >= session.max_capacity
                            ? 'Full'
                            : `${session.max_capacity - session.current_capacity} spots left`}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{format(parseISO(session.start_time), 'h:mm a')} - {format(parseISO(session.end_time), 'h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{session.organization_locations?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{session.organization_staff?.name}</span>
                        </div>
                      </div>
                      
                      {session.programs?.description && (
                        <p className="mt-3 text-sm text-gray-500">
                          {session.programs.description}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => bookClass(session.id)}
                      disabled={session.current_capacity >= session.max_capacity}
                      className={`ml-4 px-6 py-2 rounded-lg font-medium transition-colors ${
                        session.current_capacity >= session.max_capacity
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {session.current_capacity >= session.max_capacity ? 'Full' : 'Book'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setFilterOpen(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filter Classes</h3>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Locations</option>
                    <option value="harrogate">Harrogate Studio</option>
                    <option value="york">York Studio</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Type
                  </label>
                  <select
                    value={filters.classType}
                    onChange={(e) => setFilters({ ...filters, classType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Classes</option>
                    <option value="hiit">HIIT</option>
                    <option value="yoga">Yoga</option>
                    <option value="strength">Strength</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructor
                  </label>
                  <select
                    value={filters.instructor}
                    onChange={(e) => setFilters({ ...filters, instructor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Instructors</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setFilters({ location: 'all', classType: 'all', instructor: 'all' })
                    setFilterOpen(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}