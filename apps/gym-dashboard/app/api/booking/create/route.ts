import { NextRequest, NextResponse } from 'next/server'
import { availabilityEngine } from '@/app/lib/availability-engine'
import { googleCalendarService } from '@/app/lib/google-calendar-enhanced'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { z } from 'zod'

export const runtime = 'nodejs'

// Validation schema for booking creation
const createBookingSchema = z.object({
  // Booking link or organization identifier
  link_slug: z.string().optional(),
  organization_slug: z.string().optional(),
  
  // Booking details
  staff_id: z.string().uuid(),
  appointment_type_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  timezone: z.string().default('Europe/London'),
  
  // Customer information
  attendee_name: z.string().min(1, 'Name is required'),
  attendee_email: z.string().email('Valid email is required'),
  attendee_phone: z.string().optional(),
  
  // Optional booking details
  title: z.string().optional(),
  description: z.string().optional(),
  location_type: z.enum(['in_person', 'video_call', 'phone', 'custom']).default('in_person'),
  location_details: z.string().optional(),
  
  // Custom fields from booking link
  custom_fields: z.record(z.any()).default({}),
  
  // Internal tracking
  notes: z.string().optional(),
  requires_confirmation: z.boolean().default(false),
})

// POST /api/booking/create - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = createBookingSchema.parse(body)
    
    const {
      link_slug,
      organization_slug,
      staff_id,
      appointment_type_id,
      start_time,
      end_time,
      timezone,
      attendee_name,
      attendee_email,
      attendee_phone,
      title,
      description,
      location_type,
      location_details,
      custom_fields,
      notes,
      requires_confirmation
    } = validatedData

    if (!link_slug && !organization_slug) {
      return NextResponse.json({
        error: 'Either booking link slug or organization slug is required'
      }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    let organizationId: string
    let bookingLinkId: string | null = null
    let bookingLinkConfig: any = null

    // Get organization and booking link details
    if (link_slug) {
      const { data: bookingLink, error: linkError } = await adminSupabase
        .from('booking_links')
        .select(`
          *,
          organization:organizations(id, slug, name, settings)
        `)
        .eq('slug', link_slug)
        .eq('is_active', true)
        .single()

      if (linkError || !bookingLink) {
        return NextResponse.json({
          error: 'Booking link not found or inactive'
        }, { status: 404 })
      }

      organizationId = bookingLink.organization_id
      bookingLinkId = bookingLink.id
      bookingLinkConfig = bookingLink
    } else {
      const { data: organization, error: orgError } = await adminSupabase
        .from('organizations')
        .select('id, slug, name, settings')
        .eq('slug', organization_slug)
        .single()

      if (orgError || !organization) {
        return NextResponse.json({
          error: 'Organization not found'
        }, { status: 404 })
      }

      organizationId = organization.id
    }

    // Get appointment type details
    const { data: appointmentType, error: typeError } = await adminSupabase
      .from('appointment_types')
      .select('*')
      .eq('id', appointment_type_id)
      .eq('organization_id', organizationId)
      .single()

    if (typeError || !appointmentType) {
      return NextResponse.json({
        error: 'Appointment type not found'
      }, { status: 404 })
    }

    // Verify the booking link allows this appointment type
    if (bookingLinkConfig && !bookingLinkConfig.appointment_type_ids.includes(appointment_type_id)) {
      return NextResponse.json({
        error: 'Appointment type not available for this booking link'
      }, { status: 400 })
    }

    // Check if the time slot is still available
    const isAvailable = await availabilityEngine.isSlotAvailable(
      staff_id,
      organizationId,
      start_time,
      end_time,
      appointment_type_id
    )

    if (!isAvailable) {
      return NextResponse.json({
        error: 'Time slot is no longer available'
      }, { status: 409 })
    }

    // Check for existing customer in leads table
    let customerId: string
    const { data: existingLead } = await adminSupabase
      .from('leads')
      .select('id')
      .eq('email', attendee_email)
      .eq('org_id', organizationId)
      .single()

    if (existingLead) {
      customerId = existingLead.id
    } else {
      // Create new lead/customer
      const { data: newLead, error: leadError } = await adminSupabase
        .from('leads')
        .insert({
          org_id: organizationId,
          email: attendee_email,
          phone: attendee_phone,
          first_name: attendee_name.split(' ')[0],
          last_name: attendee_name.split(' ').slice(1).join(' ') || '',
          status: 'new',
          source: 'online_booking',
          tags: ['online-booking'],
          metadata: {
            booking_link_slug: link_slug,
            custom_fields
          }
        })
        .select('id')
        .single()

      if (leadError || !newLead) {
        return NextResponse.json({
          error: 'Failed to create customer record'
        }, { status: 500 })
      }

      customerId = newLead.id
    }

    // Generate booking title if not provided
    const bookingTitle = title || `${appointmentType.name} with ${attendee_name}`

    // Create the booking
    const { data: booking, error: bookingError } = await adminSupabase
      .from('bookings')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        assigned_to: staff_id,
        booking_link_id: bookingLinkId,
        appointment_type_id: appointment_type_id,
        start_time,
        end_time,
        title: bookingTitle,
        description,
        location_type,
        location_details,
        attendee_name,
        attendee_email,
        attendee_phone,
        timezone,
        custom_fields,
        notes,
        booking_status: requires_confirmation ? 'pending' : 'confirmed',
        payment_status: 'pending'
      })
      .select('*')
      .single()

    if (bookingError || !booking) {
      console.error('Failed to create booking:', bookingError)
      return NextResponse.json({
        error: 'Failed to create booking',
        details: bookingError?.message
      }, { status: 500 })
    }

    // Sync with Google Calendar (don't fail if this fails)
    try {
      await googleCalendarService.syncBookingWithGoogle(staff_id, booking, 'create')
    } catch (calendarError) {
      console.error('Failed to sync with Google Calendar:', calendarError)
      // Continue without failing the booking
    }

    // Schedule notifications (confirmation email, reminders, etc.)
    try {
      await scheduleBookingNotifications(booking, appointmentType, organizationId)
    } catch (notificationError) {
      console.error('Failed to schedule notifications:', notificationError)
      // Continue without failing the booking
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        title: booking.title,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.booking_status,
        appointment_type: appointmentType.name,
        staff_name: null, // Would need another query to get this
        attendee_name: booking.attendee_name,
        attendee_email: booking.attendee_email,
        location_type: booking.location_type,
        location_details: booking.location_details,
        confirmation_token: booking.confirmation_token,
        cancellation_token: booking.cancellation_token
      }
    })

  } catch (error) {
    console.error('Error creating booking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to schedule booking notifications
async function scheduleBookingNotifications(
  booking: any,
  appointmentType: any,
  organizationId: string
) {
  const adminSupabase = createAdminClient()
  
  const notifications = []

  // Confirmation email (send immediately)
  notifications.push({
    organization_id: organizationId,
    booking_id: booking.id,
    type: 'email',
    template: 'booking_confirmation',
    recipient_email: booking.attendee_email,
    recipient_name: booking.attendee_name,
    subject: `Booking Confirmed: ${booking.title}`,
    body: generateBookingConfirmationEmail(booking, appointmentType),
    send_at: new Date().toISOString()
  })

  // Reminder email (24 hours before)
  const reminderTime = new Date(new Date(booking.start_time).getTime() - (24 * 60 * 60 * 1000))
  if (reminderTime > new Date()) {
    notifications.push({
      organization_id: organizationId,
      booking_id: booking.id,
      type: 'email',
      template: 'booking_reminder',
      recipient_email: booking.attendee_email,
      recipient_name: booking.attendee_name,
      subject: `Reminder: ${booking.title} tomorrow`,
      body: generateBookingReminderEmail(booking, appointmentType),
      send_at: reminderTime.toISOString()
    })
  }

  // SMS reminder (if phone number provided and 2 hours before)
  if (booking.attendee_phone) {
    const smsReminderTime = new Date(new Date(booking.start_time).getTime() - (2 * 60 * 60 * 1000))
    if (smsReminderTime > new Date()) {
      notifications.push({
        organization_id: organizationId,
        booking_id: booking.id,
        type: 'sms',
        template: 'booking_sms_reminder',
        recipient_phone: booking.attendee_phone,
        recipient_name: booking.attendee_name,
        subject: '',
        body: `Reminder: You have ${appointmentType.name} in 2 hours at ${new Date(booking.start_time).toLocaleTimeString()}. Reply STOP to opt out.`,
        send_at: smsReminderTime.toISOString()
      })
    }
  }

  // Insert all notifications
  if (notifications.length > 0) {
    await adminSupabase
      .from('notifications')
      .insert(notifications)
  }
}

// Helper function to generate confirmation email
function generateBookingConfirmationEmail(booking: any, appointmentType: any): string {
  return `
    <h2>Your booking is confirmed!</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>Your ${appointmentType.name} appointment has been confirmed.</p>
    
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</li>
      <li><strong>Duration:</strong> ${appointmentType.duration_minutes} minutes</li>
      ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
    </ul>
    
    <p>Need to reschedule or cancel? <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/manage/${booking.cancellation_token}">Click here</a></p>
    
    <p>We look forward to seeing you!</p>
  `
}

// Helper function to generate reminder email
function generateBookingReminderEmail(booking: any, appointmentType: any): string {
  return `
    <h2>Appointment Reminder</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>This is a friendly reminder about your upcoming ${appointmentType.name} appointment tomorrow.</p>
    
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${new Date(booking.start_time).toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</li>
      ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
    </ul>
    
    <p>Need to reschedule or cancel? <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/manage/${booking.cancellation_token}">Click here</a></p>
    
    <p>See you soon!</p>
  `
}