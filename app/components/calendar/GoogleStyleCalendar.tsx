'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import type { CalendarEvent } from '@/app/lib/types/calendar'
import './GoogleStyleCalendar.css'

interface GoogleStyleCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onSlotSelect?: (slot: { startTime: Date; endTime: Date }) => void
  onEventClick?: (event: CalendarEvent) => void
  events: CalendarEvent[]
  view?: 'week' | 'month' | 'day'
}

// Event colors similar to Google Calendar
const EVENT_COLORS = {
  gym: '#1a73e8',        // Blue
  'no-calls': '#4285f4', // Light blue
  harrogate: '#34a853',  // Green
  martin: '#fbbc04',     // Yellow
  sean: '#ea4335',       // Red
  lizzie: '#673ab7',     // Purple
  liz: '#ff6d00',        // Orange
  'liz-massage': '#795548', // Brown
  work: '#607d8b',       // Blue grey
  recycling: '#009688',  // Teal
  default: '#1a73e8'     // Default blue
}

export function GoogleStyleCalendar({ 
  selectedDate,
  onDateSelect,
  onSlotSelect,
  onEventClick,
  events = [],
  view = 'week'
}: GoogleStyleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate))
  const [currentTime, setCurrentTime] = useState(new Date())
  const timelineRef = useRef<HTMLDivElement>(null)
  const hoursRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current && view === 'week') {
      const currentHour = new Date().getHours()
      const scrollPosition = currentHour * 60 - 200 // 60px per hour, offset for better view
      timelineRef.current.scrollTop = scrollPosition
    }
  }, [view])

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const getWeekDays = () => {
    const start = getWeekStart(currentDate)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const formatTime = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    onDateSelect(new Date())
  }

  const getEventStyle = (event: CalendarEvent) => {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    const startHour = start.getHours() + start.getMinutes() / 60
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    // Determine color based on event title
    let bgColor = EVENT_COLORS.default
    const title = event.title.toLowerCase()
    
    for (const [key, color] of Object.entries(EVENT_COLORS)) {
      if (title.includes(key)) {
        bgColor = color
        break
      }
    }
    
    return {
      top: `${startHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: bgColor,
      opacity: 0.9
    }
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (onSlotSelect) {
      const startTime = new Date(date)
      startTime.setHours(hour, 0, 0, 0)
      const endTime = new Date(startTime)
      endTime.setHours(hour + 1, 0, 0, 0)
      onSlotSelect({ startTime, endTime })
    }
  }

  const getCurrentTimePosition = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    return (hours + minutes / 60) * 60
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const weekDays = getWeekDays()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (view === 'week') {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePrevious}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={navigateNext}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-lg font-medium">
              {monthNames[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
            </h2>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Time labels */}
          <div className="w-16 bg-gray-900 border-r border-gray-700">
            <div className="h-12 border-b border-gray-700" /> {/* Spacer for day headers */}
            <div ref={hoursRef} className="overflow-hidden">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="h-[60px] px-2 py-1 text-xs text-gray-400 text-right"
                >
                  {hour === 0 ? '' : formatTime(hour)}
                </div>
              ))}
            </div>
          </div>

          {/* Days and time slots */}
          <div className="flex-1 overflow-auto google-calendar-scrollbar" ref={timelineRef}>
            <div className="flex h-full">
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="flex-1 border-r border-gray-700 last:border-r-0">
                  {/* Day header */}
                  <div className="h-12 bg-gray-900 border-b border-gray-700 px-2 py-1 sticky top-0 z-10">
                    <div className={`text-xs font-medium ${isToday(day) ? 'text-blue-400' : 'text-gray-300'}`}>
                      {dayNames[day.getDay()]}
                    </div>
                    <div className={`text-lg font-medium ${isToday(day) ? 'text-blue-400' : 'text-white'}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="relative">
                    {/* Hour lines */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer transition-colors"
                        onClick={() => handleTimeSlotClick(day, hour)}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday(day) && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                        style={{ top: `${getCurrentTimePosition()}px` }}
                      >
                        <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                      </div>
                    )}

                    {/* Events */}
                    {getEventsForDay(day).map((event) => (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 rounded-md p-1 cursor-pointer hover:shadow-lg transition-shadow text-white text-xs overflow-hidden"
                        style={getEventStyle(event)}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="truncate opacity-90">
                          {new Date(event.startTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback to original month view for now
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-white">Month view coming soon...</p>
    </div>
  )
}