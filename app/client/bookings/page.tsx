'use client'

import { Calendar, Clock, MapPin, Users, ChevronLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { format, parseISO, differenceInHours } from 'date-fns'

export default function ClientBookingsPage() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<any[]>([])
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (client) {
      loadBookings()
    }
  }, [client])

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

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        class_sessions (
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
        )
      `)
      .eq('customer_id', client.id)
      .gte('class_sessions.start_time', new Date().toISOString())
      .order('class_sessions(start_time)', { ascending: true })

    setBookings(data || [])
  }

  const canCancelBooking = (booking: any) => {
    const classTime = parseISO(booking.class_sessions.start_time)
    const hoursUntilClass = differenceInHours(classTime, new Date())
    return hoursUntilClass >= 24
  }

  const cancelBooking = async () => {
    if (!selectedBooking) return

    const response = await fetch(`/api/booking/${selectedBooking.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: client.id,
        organizationId: client.organization_id
      })
    })

    if (response.ok) {
      setCancelModalOpen(false)
      setSelectedBooking(null)
      loadBookings()
    } else {
      const error = await response.json()
      alert(error.error || 'Failed to cancel booking')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed')
  const pastBookings = bookings.filter(b => b.status === 'attended' || b.status === 'no_show')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/client')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</div>
            <div className="text-sm text-gray-500">Upcoming Classes</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900">8</div>
            <div className="text-sm text-gray-500">Credits Remaining</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-2xl font-bold text-gray-900">{pastBookings.length}</div>
            <div className="text-sm text-gray-500">Classes Attended</div>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Classes</h2>
          {upcomingBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You don't have any upcoming classes</p>
              <button
                onClick={() => router.push('/client/schedule')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book a Class
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {booking.class_sessions.programs?.name}
                        </h3>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(parseISO(booking.class_sessions.start_time), 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(parseISO(booking.class_sessions.start_time), 'h:mm a')} - 
                              {format(parseISO(booking.class_sessions.end_time), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{booking.class_sessions.organization_locations?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{booking.class_sessions.organization_staff?.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Confirmed
                        </span>
                        {canCancelBooking(booking) ? (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setCancelModalOpen(true)
                            }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Cannot cancel within 24 hours
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Classes */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Classes</h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm border opacity-75">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {booking.class_sessions.programs?.name}
                        </h3>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(parseISO(booking.class_sessions.start_time), 'EEEE, MMMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{booking.class_sessions.organization_staff?.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${
                        booking.status === 'attended' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status === 'attended' ? 'Attended' : 'Missed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {cancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setCancelModalOpen(false)} />
            
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Cancel Class</h3>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel your booking for:
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold">{selectedBooking.class_sessions.programs?.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(parseISO(selectedBooking.class_sessions.start_time), 'EEEE, MMMM d')} at{' '}
                    {format(parseISO(selectedBooking.class_sessions.start_time), 'h:mm a')}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Keep Booking
                </button>
                <button
                  onClick={cancelBooking}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Cancel Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}