'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { Calendar } from '@/app/components/calendar/Calendar'
import { GoogleStyleCalendar } from '@/app/components/calendar/GoogleStyleCalendar'
import { CalendarSettings } from '@/app/components/calendar/CalendarSettings'
import { BookingModal } from '@/app/components/calendar/BookingModal'
import { Calendar as CalendarIcon, Settings, Link, Plus, LayoutGrid, CalendarDays } from 'lucide-react'
import type { CalendarEvent, TimeSlot } from '@/app/lib/types/calendar'

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'booking-links'>('calendar')
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')
  const [useGoogleStyle, setUseGoogleStyle] = useState(true)

  useEffect(() => {
    // Check for success/error messages from Google Calendar connect
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success === 'google_connected') {
      alert('Google Calendar connected successfully!')
      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (error) {
      alert(getErrorMessage(error))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    // Fetch initial events
    fetchEvents()
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [selectedDate])

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'invalid_state':
        return 'Invalid authentication state. Please try again.'
      case 'no_code':
        return 'No authorization code received. Please try again.'
      case 'token_exchange_failed':
        return 'Failed to connect Google Calendar. Please try again.'
      case 'user_info_failed':
        return 'Failed to get user information. Please try again.'
      case 'not_authenticated':
        return 'You must be logged in to connect Google Calendar.'
      case 'update_failed':
      case 'save_failed':
        return 'Failed to save calendar integration. Please try again.'
      case 'callback_error':
        return 'An error occurred during calendar connection. Please try again.'
      default:
        return 'Failed to connect Google Calendar. Please try again.'
    }
  }

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      
      const params = new URLSearchParams({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      })
      
      // Try to fetch from Google Calendar first
      const response = await fetch(`/api/calendar/google-events?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        console.log(`Loaded ${data.events?.length || 0} events from Google Calendar`)
      } else {
        // Fallback to local events
        const localResponse = await fetch(`/api/calendar/events?${params}`)
        if (localResponse.ok) {
          const data = await localResponse.json()
          setEvents(data.events || [])
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      alert('Failed to load calendar events')
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setShowBookingModal(true)
  }

  const handleGoogleSlotSelect = (slot: { startTime: Date; endTime: Date }) => {
    const timeSlot: TimeSlot = {
      id: `slot-${slot.startTime.getTime()}`,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      available: true
    }
    setSelectedSlot(timeSlot)
    setShowBookingModal(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event)
    // You can add modal or detail view here
  }

  const handleBookingComplete = () => {
    setShowBookingModal(false)
    setSelectedSlot(null)
    fetchEvents() // Refresh events
  }

  const getDayEvents = () => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === selectedDate.toDateString()
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }

  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    
    return `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-orange-500 opacity-70 hover:opacity-100 hover:border-orange-500'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-orange-500 opacity-70 hover:opacity-100 hover:border-orange-500'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('booking-links')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'booking-links'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-orange-500 opacity-70 hover:opacity-100 hover:border-orange-500'
            }`}
          >
            Booking Links
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  calendarView === 'week' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <CalendarDays className="w-4 h-4 inline mr-1" />
                Week
              </button>
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  calendarView === 'month' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4 inline mr-1" />
                Month
              </button>
            </div>
            <button
              onClick={() => setUseGoogleStyle(!useGoogleStyle)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {useGoogleStyle ? 'Switch to Classic View' : 'Switch to Google Style'}
            </button>
          </div>

          {/* Calendar Display */}
          {useGoogleStyle ? (
            <div className="h-[700px]">
              <GoogleStyleCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onSlotSelect={handleGoogleSlotSelect}
                onEventClick={handleEventClick}
                events={events}
                view={calendarView}
              />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr,350px] gap-6">
              <div>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onSlotSelect={handleSlotSelect}
                />
              </div>

              {/* Day Events */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2 text-white">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-white text-sm mb-4">
                  {getDayEvents().length} events scheduled
                </p>
                
                {getDayEvents().length === 0 ? (
                  <p className="text-sm text-white opacity-60">No events scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {getDayEvents().map((event) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        <h4 className="font-medium text-sm text-white">{event.title}</h4>
                        <p className="text-xs text-white mt-1">
                          {formatEventTime(event)}
                        </p>
                        {event.attendees.length > 0 && (
                          <p className="text-xs text-white opacity-60 mt-1">
                            With: {event.attendees.map(a => a.email).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <CalendarSettings />
      )}

      {activeTab === 'booking-links' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-2 text-white">Booking Links</h3>
            <p className="text-white opacity-70 text-sm mb-4">
              Create shareable links for people to book time with you
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-white opacity-60">
                No booking links created yet
              </p>
              <button 
                onClick={() => alert('Booking links feature coming soon! This will allow you to create shareable links for clients to book appointments.')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Booking Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          open={showBookingModal}
          onOpenChange={setShowBookingModal}
          slot={selectedSlot}
          duration={30}
          title="Consultation"
          onBookingComplete={handleBookingComplete}
        />
      )}
        </div>
      </div>
    </DashboardLayout>
  )
}