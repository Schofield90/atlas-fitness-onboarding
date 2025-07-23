'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react'
import type { CalendarEvent, TimeSlot } from '@/app/lib/types/calendar'

interface CalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onSlotSelect?: (slot: TimeSlot) => void
  publicUserId?: string
  slotDuration?: number
}

export function Calendar({ 
  selectedDate,
  onDateSelect,
  onSlotSelect,
  publicUserId,
  slotDuration
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate))
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [currentMonth])

  useEffect(() => {
    fetchAvailableSlots()
  }, [selectedDate, publicUserId])

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const params = new URLSearchParams({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      })
      
      const response = await fetch(`/api/calendar/events?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate.toISOString().split('T')[0]
      })
      
      if (publicUserId) {
        params.append('userId', publicUserId)
      }
      
      const response = await fetch(`/api/calendar/availability?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const getDayEvents = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
    })
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
  }

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleDayClick = (day: number) => {
    if (isPastDate(day)) return
    
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onDateSelect(date)
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <div className="grid md:grid-cols-[1fr,320px] gap-6">
      {/* Calendar Grid */}
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-20" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1
            const dayEvents = getDayEvents(day)
            const isPast = isPastDate(day)
            const selected = isSelected(day)
            const today = isToday(day)

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  h-20 p-2 rounded-lg border transition-all
                  ${today ? 'border-orange-500' : 'border-gray-700'}
                  ${selected ? 'bg-gray-700 border-orange-500' : ''}
                  ${isPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'}
                `}
              >
                <div className={`font-medium text-sm mb-1 ${today ? 'text-orange-500' : ''}`}>
                  {day}
                </div>
                {!publicUserId && dayEvents.length > 0 && (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs bg-orange-600 text-white rounded px-1 py-0.5 truncate"
                        title={event.title}
                      >
                        {formatTime(event.startTime)}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      {onSlotSelect && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">
            Available Times
            <span className="block text-sm text-gray-400 font-normal mt-1">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </h3>

          {loadingSlots ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-gray-400 text-sm">No available times for this date</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    slot.available 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-700/50 opacity-50 cursor-not-allowed'
                  }`}
                  disabled={!slot.available}
                  onClick={() => slot.available && onSlotSelect(slot)}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-left">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                  {!slot.available && (
                    <span className="text-xs text-gray-400">Unavailable</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}