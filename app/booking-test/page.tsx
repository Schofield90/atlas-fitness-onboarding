'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BookingTestPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setError(null)
      const supabase = createClient()
      
      // Simple query without joins
      const { data, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(20)

      if (queryError) {
        console.error('Query error:', queryError)
        setError(`Database error: ${queryError.message}`)
      } else {
        setBookings(data || [])
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(`Failed to fetch bookings: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bookings (Test Version)</h1>
          <p className="text-gray-400">Simplified booking view for testing</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-200">Error Loading Bookings</h3>
                <p className="text-sm text-red-300 mt-1">{error}</p>
                <button
                  onClick={fetchBookings}
                  className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No bookings found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-2">
                        {booking.title || 'Booking'}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-400">
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDateTime(booking.start_time)}
                          {booking.end_time && ` - ${new Date(booking.end_time).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}`}
                        </p>
                        
                        {booking.attendee_name && (
                          <p className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {booking.attendee_name}
                            {booking.attendee_email && ` • ${booking.attendee_email}`}
                          </p>
                        )}
                        
                        {booking.meeting_type && (
                          <p className="text-gray-500">
                            Type: {booking.meeting_type}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      booking.booking_status === 'confirmed' ? 'bg-green-900 text-green-300' :
                      booking.booking_status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      booking.booking_status === 'cancelled' ? 'bg-red-900 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {booking.booking_status || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push('/calendar')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            View Calendar
          </button>
          <button
            onClick={() => router.push('/booking')}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Go to Main Booking Page
          </button>
        </div>

        <div className="mt-8 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Debug Info</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• This is a simplified test version without complex queries</li>
            <li>• Shows raw booking data from the database</li>
            <li>• No joins or nested data fetching</li>
            <li>• Total bookings loaded: {bookings.length}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}