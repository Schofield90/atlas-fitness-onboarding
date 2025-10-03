'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface RegistrationsTabProps {
  customerId: string
}

export default function RegistrationsTab({ customerId }: RegistrationsTabProps) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [customerId])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          class_session:class_sessions(
            *,
            program:programs(*)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-600'
      case 'cancelled':
        return 'bg-red-600'
      case 'attended':
        return 'bg-blue-600'
      case 'no_show':
        return 'bg-gray-600'
      default:
        return 'bg-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading registrations...</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">Class Registrations</h3>
      
      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No class registrations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-white">
                    {booking.class_session?.program?.name || 'Unknown Class'}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatBritishDateTime(booking.class_session?.start_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {booking.class_session?.duration_minutes} min
                    </span>
                    {booking.class_session?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {booking.class_session.location}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Booked on {formatBritishDateTime(booking.created_at)}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs text-white rounded-full ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}