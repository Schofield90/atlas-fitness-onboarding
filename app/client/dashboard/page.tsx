'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, MapPin, User, Bell, CreditCard, LogOut } from 'lucide-react'

interface Booking {
  id: string
  class_session_id: string
  status: string
  booked_at: string
  class_sessions: {
    date: string
    start_time: string
    end_time: string
    location: string
    class_types: {
      name: string
    }
    instructors: {
      name: string
    }
  }
}

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  client_type: string
}

export default function ClientDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientData()
  }, [])

  const fetchClientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/client-portal/login')
        return
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientError || !clientData) {
        // Try by email
        const { data: clientByEmail } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .single()
        
        if (clientByEmail) {
          setClient(clientByEmail)
          await fetchBookings(clientByEmail.id)
        }
      } else {
        setClient(clientData)
        await fetchBookings(clientData.id)
      }
    } catch (error) {
      console.error('Error fetching client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          class_sessions (
            date,
            start_time,
            end_time,
            location,
            class_types (name),
            instructors (name)
          )
        `)
        .eq('customer_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/client-portal/login')
  }

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error
      
      // Refresh bookings
      if (client) {
        await fetchBookings(client.id)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        {client && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Welcome back, {client.first_name}!</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{client.first_name} {client.last_name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Membership</p>
                  <p className="font-medium capitalize">{client.client_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/client/booking"
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
          >
            <Calendar className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">Book a Class</h3>
            <p className="text-blue-100 text-sm mt-1">View and book available classes</p>
          </Link>

          <Link
            href="/client/profile"
            className="bg-gray-600 text-white rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <User className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">My Profile</h3>
            <p className="text-gray-100 text-sm mt-1">Update your information</p>
          </Link>

          <Link
            href="/client/membership"
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
          >
            <CreditCard className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">Membership</h3>
            <p className="text-purple-100 text-sm mt-1">View membership details</p>
          </Link>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">My Bookings</h2>
          </div>
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isUpcoming = new Date(booking.class_sessions.date) >= new Date()
                  const isCancelled = booking.status === 'cancelled'

                  return (
                    <div
                      key={booking.id}
                      className={`border rounded-lg p-4 ${
                        isCancelled ? 'bg-gray-50 opacity-60' : 'hover:shadow-md transition-shadow'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {booking.class_sessions.class_types.name}
                          </h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(booking.class_sessions.date)}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              {formatTime(booking.class_sessions.start_time)} - {formatTime(booking.class_sessions.end_time)}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {booking.class_sessions.location || 'Main Studio'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Instructor: {booking.class_sessions.instructors.name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {isCancelled ? (
                            <span className="text-sm text-red-600 font-medium">Cancelled</span>
                          ) : isUpcoming ? (
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-sm text-gray-500">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't booked any classes yet</p>
                <Link
                  href="/client/booking"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Book Your First Class
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}