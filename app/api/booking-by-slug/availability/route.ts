import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, startOfDay, endOfDay, format, addMinutes, setHours, setMinutes } from 'date-fns'
import { getGoogleCalendarBusyTimes } from '@/app/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const timezone = searchParams.get('timezone') || 'Europe/London'
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Create Supabase client for database access
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Service configuration error' 
      }, { status: 500 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get booking link details
    const { data: bookingLink, error: linkError } = await supabase
      .from('booking_links')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (linkError || !bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    // Default to next 7 days if no dates provided
    const startDate = startDateParam ? new Date(startDateParam) : startOfDay(new Date())
    const endDate = endDateParam ? new Date(endDateParam) : endOfDay(addDays(new Date(), 7))

    // Get Google Calendar busy times if user is connected
    let busyTimes: Array<{ start: string; end: string }> = []
    if (bookingLink.user_id) {
      try {
        busyTimes = await getGoogleCalendarBusyTimes(
          bookingLink.user_id, 
          startDate.toISOString(), 
          endDate.toISOString()
        )
        console.log(`Found ${busyTimes.length} busy times from Google Calendar`)
      } catch (error) {
        console.warn('Could not fetch Google Calendar busy times:', error)
        // Continue without Google Calendar integration
      }
    }

    // Helper function to check if a slot conflicts with busy times
    const isSlotAvailable = (slotStart: Date, slotEnd: Date): boolean => {
      return !busyTimes.some(busyTime => {
        const busyStart = new Date(busyTime.start)
        const busyEnd = new Date(busyTime.end)
        
        // Check for any overlap between slot and busy time
        return (slotStart < busyEnd && slotEnd > busyStart)
      })
    }

    // Generate available slots - Monday to Friday 9 AM to 5 PM
    const availableSlots = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      
      // Only weekdays (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Generate slots from 9 AM to 5 PM with 30-minute intervals
        for (let hour = 9; hour < 17; hour++) {
          for (let minute of [0, 30]) {
            const slotStart = setMinutes(setHours(new Date(currentDate), hour), minute)
            const slotEnd = addMinutes(slotStart, 30)
            
            // Skip past slots and check Google Calendar availability
            if (slotStart > new Date() && isSlotAvailable(slotStart, slotEnd)) {
              availableSlots.push({
                start_time: slotStart.toISOString(),
                end_time: slotEnd.toISOString(),
                staff_id: bookingLink.user_id || 'default-staff',
                staff_name: 'Atlas Fitness Trainer',
                appointment_type_id: bookingLink.appointment_type_ids?.[0] || 'default',
                appointment_type_name: bookingLink.name || 'Consultation',
                duration_minutes: 30
              })
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Group slots by date
    const slotsByDate: Record<string, typeof availableSlots> = {}
    availableSlots.forEach(slot => {
      const date = slot.start_time.split('T')[0]
      if (!slotsByDate[date]) {
        slotsByDate[date] = []
      }
      slotsByDate[date].push(slot)
    })

    return NextResponse.json({
      availability: Object.entries(slotsByDate).map(([date, slots]) => ({
        date,
        slots
      })),
      timezone,
      total_slots: availableSlots.length,
      google_calendar_integration: {
        connected: busyTimes.length > 0 || bookingLink.user_id != null,
        busy_times_found: busyTimes.length,
        user_id: bookingLink.user_id
      }
    })

  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}