'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '../components/DashboardLayout'
import { Calendar, Clock, User, Mail, Phone, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Try to fetch from bookings table (might not exist)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!bookingsError) {
        setBookings(bookingsData || [])
      }

      // Fetch calendar events with "Booking:" in title
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .or(`title.ilike.%Booking:%,event_type.eq.booking`)
        .order('start_time', { ascending: false })
        .limit(20)

      if (!eventsError) {
        setCalendarEvents(eventsData || [])
      } else {
        console.error('Error fetching calendar events:', eventsError)
      }

      // Fetch recent leads from booking source
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('source', 'booking')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!leadsError) {
        setLeads(leadsData || [])
      } else {
        console.error('Error fetching leads:', leadsError)
      }

    } catch (err: any) {
      console.error('Error fetching bookings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch {
      return dateString
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bookings</h1>
            <p className="text-gray-600">View all booking requests from your booking page</p>
          </div>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Calendar Events (Primary Storage) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Events (Bookings)
          </h2>
          
          {calendarEvents.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calendarEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">
                                {formatDateTime(event.start_time)}
                              </div>
                              <div className="text-xs text-gray-500">
                                to {formatDateTime(event.end_time)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{event.title}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {event.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            event.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {event.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDateTime(event.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No booking events found in calendar</p>
            </div>
          )}
        </div>

        {/* Leads from Bookings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Leads (From Bookings)
          </h2>
          
          {leads.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {lead.first_name} {lead.last_name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {lead.email}
                            </div>
                            {lead.phone && (
                              <div className="flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {lead.notes}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDateTime(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No booking leads found</p>
            </div>
          )}
        </div>

        {/* Bookings Table (If exists) */}
        {bookings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Bookings Table
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{booking.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <pre className="text-xs">{JSON.stringify(booking, null, 2)}</pre>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDateTime(booking.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Where are bookings stored?</h3>
          <p className="text-sm text-gray-700 mb-3">
            Bookings can be stored in three places depending on what tables exist:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><strong>Calendar Events</strong> - Primary location, shows in your calendar</li>
            <li><strong>Leads</strong> - Fallback if calendar_events table has issues</li>
            <li><strong>Bookings Table</strong> - If a dedicated bookings table exists</li>
          </ul>
          <p className="text-sm text-gray-700 mt-3">
            All bookings should also appear in your Google Calendar if connected.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}