import { NextRequest, NextResponse } from 'next/server'
import { bookingLinkService, BookingRequest } from '@/app/lib/services/booking-link'
import { parseISO, addMinutes } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const {
      appointment_type_id,
      start_time,
      staff_id,
      attendee_name,
      attendee_email,
      attendee_phone,
      custom_fields,
      notes,
      timezone = 'Europe/London'
    } = body
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Validate required fields
    if (!appointment_type_id || !start_time || !attendee_name || !attendee_email) {
      return NextResponse.json(
        { error: 'Missing required fields: appointment_type_id, start_time, attendee_name, attendee_email' },
        { status: 400 }
      )
    }

    // Get the booking link
    const bookingLink = await bookingLinkService.getBookingLink(slug)
    if (!bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    if (!bookingLink.is_active) {
      return NextResponse.json({ error: 'This booking link is no longer active' }, { status: 403 })
    }

    // Track form start for analytics
    await bookingLinkService.trackEvent(slug, 'form_started', {
      appointment_type_id,
      user_agent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for')
    })

    // Get appointment type details to calculate end time
    const { data: appointmentType, error: atError } = await bookingLinkService['supabase']
      .from('appointment_types')
      .select('*')
      .eq('id', appointment_type_id)
      .single()

    if (atError || !appointmentType) {
      return NextResponse.json({ error: 'Invalid appointment type' }, { status: 400 })
    }

    const startDateTime = parseISO(start_time)
    const endDateTime = addMinutes(startDateTime, appointmentType.duration_minutes)

    // Determine staff member for the booking
    let assignedStaffId = staff_id
    if (!assignedStaffId && bookingLink.assigned_staff_ids?.length) {
      // If no specific staff selected but link has assigned staff, use the first one
      // In a round-robin system, this would use more sophisticated logic
      assignedStaffId = bookingLink.assigned_staff_ids[0]
    }

    // Check payment requirements
    if (bookingLink.payment_settings.enabled && bookingLink.payment_settings.amount > 0) {
      // For now, we'll skip payment processing - this would integrate with Stripe
      console.log('Payment required but not implemented yet')
    }

    // Check capacity for group bookings
    if (appointmentType.max_capacity > 1) {
      const capacity = await bookingLinkService.checkClassCapacity(
        appointment_type_id,
        start_time
      )
      
      if (!capacity.available) {
        return NextResponse.json(
          { error: 'This session is fully booked' },
          { status: 409 }
        )
      }
    }

    // Create the booking
    const bookingRequest: BookingRequest = {
      booking_link_id: bookingLink.id,
      appointment_type_id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      attendee_name,
      attendee_email,
      attendee_phone,
      custom_fields,
      notes,
      timezone,
      staff_id: assignedStaffId
    }

    const booking = await bookingLinkService.createBooking(bookingRequest)

    // Track successful booking for analytics
    await bookingLinkService.trackEvent(slug, 'booking_completed', {
      booking_id: booking.id,
      appointment_type_id,
      staff_id: assignedStaffId
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        confirmation_token: booking.confirmation_token,
        cancellation_token: booking.cancellation_token
      },
      message: bookingLink.confirmation_settings.auto_confirm 
        ? 'Your booking has been confirmed!' 
        : 'Your booking request has been received and is pending confirmation.',
      redirect_url: bookingLink.confirmation_settings.redirect_url
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)
    
    // Track failed booking attempt
    try {
      await bookingLinkService.trackEvent(slug, 'booking_cancelled', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (trackError) {
      console.error('Error tracking failed booking:', trackError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 }
    )
  }
}