import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getGoogleCalendarBusyTimes } from '@/app/lib/google-calendar'
import type { TimeSlot, CalendarSettings } from '@/app/lib/types/calendar'

export const runtime = 'nodejs'

// Default calendar settings
const defaultSettings: CalendarSettings = {
  workingHours: {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '12:00' },
    sunday: { enabled: false, start: '09:00', end: '12:00' },
  },
  slotDuration: 30, // 30 minutes
  bufferTime: 15, // 15 minutes between appointments
  timezone: 'Europe/London',
  googleCalendarConnected: false
}

// Get available time slots for a specific date
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const userId = searchParams.get('userId') // For public booking links
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }
    
    // Get user for settings
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) {
        targetUserId = user.id
      }
    }
    
    // Get user's calendar settings if available
    let userSettings = defaultSettings
    if (targetUserId) {
      const { data: settings } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .single()
      
      if (settings) {
        userSettings = {
          workingHours: settings.working_hours || defaultSettings.workingHours,
          slotDuration: settings.slot_duration || defaultSettings.slotDuration,
          bufferTime: settings.buffer_time || defaultSettings.bufferTime,
          timezone: settings.timezone || defaultSettings.timezone,
          googleCalendarConnected: settings.google_calendar_connected || false
        }
      }
    }
    
    const selectedDate = new Date(date)
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    // Get working hours for this day
    const daySettings = userSettings.workingHours[dayOfWeek]
    
    if (!daySettings?.enabled) {
      return NextResponse.json({ slots: [] })
    }
    
    // Generate time slots
    const slots: TimeSlot[] = []
    const [startHour, startMin] = daySettings.start.split(':').map(Number)
    const [endHour, endMin] = daySettings.end.split(':').map(Number)
    
    const startTime = new Date(selectedDate)
    startTime.setHours(startHour, startMin, 0, 0)
    
    const endTime = new Date(selectedDate)
    endTime.setHours(endHour, endMin, 0, 0)
    
    let currentSlot = new Date(startTime)
    
    while (currentSlot < endTime) {
      const slotEnd = new Date(currentSlot)
      slotEnd.setMinutes(slotEnd.getMinutes() + defaultSettings.slotDuration)
      
      // Check if this slot is in the past
      const now = new Date()
      const isPast = currentSlot < now
      
      // Check against existing bookings from database
      let isBooked = false
      
      // Get all events for this date
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      if (targetUserId) {
        const { data: events } = await supabase
          .from('calendar_events')
          .select('start_time, end_time')
          .eq('created_by', targetUserId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .neq('status', 'cancelled')
        
        if (events) {
          // Check if this slot overlaps with any existing event
          isBooked = events.some(event => {
            const eventStart = new Date(event.start_time)
            const eventEnd = new Date(event.end_time)
            return currentSlot < eventEnd && slotEnd > eventStart
          })
        }
        
        // Also check Google Calendar if connected
        if (!isBooked && userSettings.googleCalendarConnected) {
          try {
            const busyTimes = await getGoogleCalendarBusyTimes(
              targetUserId,
              startOfDay.toISOString(),
              endOfDay.toISOString()
            )
            
            isBooked = busyTimes.some(busy => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              return currentSlot < busyEnd && slotEnd > busyStart
            })
          } catch (error) {
            console.error('Failed to check Google Calendar:', error)
          }
        }
      }
      
      slots.push({
        id: `${date}-${currentSlot.getHours()}-${currentSlot.getMinutes()}`,
        startTime: currentSlot.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !isPast && !isBooked
      })
      
      // Move to next slot with buffer time
      currentSlot = new Date(slotEnd)
      currentSlot.setMinutes(currentSlot.getMinutes() + defaultSettings.bufferTime)
    }
    
    return NextResponse.json({ 
      date,
      dayOfWeek,
      slots,
      settings: {
        slotDuration: userSettings.slotDuration,
        bufferTime: userSettings.bufferTime,
        timezone: userSettings.timezone
      }
    })
    
  } catch (error) {
    console.error('Error getting availability:', error)
    return NextResponse.json({
      error: 'Failed to get availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}