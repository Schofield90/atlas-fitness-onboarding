import { NextRequest, NextResponse } from 'next/server'
import { aiBookingTools } from '@/app/lib/ai-booking-tools'
import { createClient } from '@/app/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'nodejs'

// Validation schemas
const findAvailabilitySchema = z.object({
  action: z.literal('find_availability'),
  organizationSlug: z.string().optional(),
  date: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  duration: z.number().optional(),
  appointmentTypeId: z.string().optional(),
  staffId: z.string().optional(),
  limit: z.number().optional()
})

const bookSlotSchema = z.object({
  action: z.literal('book_slot'),
  organizationSlug: z.string().optional(),
  staffId: z.string(),
  appointmentTypeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendeeName: z.string(),
  attendeeEmail: z.string().email(),
  attendeePhone: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  locationDetails: z.string().optional(),
  customFields: z.record(z.any()).optional()
})

const rescheduleBookingSchema = z.object({
  action: z.literal('reschedule_booking'),
  bookingId: z.string(),
  newStartTime: z.string(),
  newEndTime: z.string(),
  reason: z.string().optional()
})

const cancelBookingSchema = z.object({
  action: z.literal('cancel_booking'),
  bookingId: z.string(),
  reason: z.string().optional()
})

const getBookingSchema = z.object({
  action: z.literal('get_booking'),
  bookingId: z.string()
})

const getBookingsSchema = z.object({
  action: z.literal('get_bookings'),
  organizationSlug: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  staffId: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional()
})

const aiBookingActionSchema = z.discriminatedUnion('action', [
  findAvailabilitySchema,
  bookSlotSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  getBookingSchema,
  getBookingsSchema
])

// POST /api/ai/booking - AI Booking Tools endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the action
    const validatedData = aiBookingActionSchema.parse(body)

    // Get authentication context
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Create context for the AI tools
    let context: any = {}

    if (user) {
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('organization_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .single()

      context = {
        userId: user.id,
        organizationId: userOrg?.org_id,
        userRole: userOrg?.role
      }
    }

    // Allow organization slug to override context for public booking links
    if (validatedData.organizationSlug) {
      context.organizationSlug = validatedData.organizationSlug
    }

    // Execute the requested action
    let result: any

    switch (validatedData.action) {
      case 'find_availability':
        result = await aiBookingTools.findAvailability(context, {
          date: validatedData.date,
          dateRange: validatedData.dateRange,
          duration: validatedData.duration,
          appointmentTypeId: validatedData.appointmentTypeId,
          staffId: validatedData.staffId,
          limit: validatedData.limit
        })
        break

      case 'book_slot':
        result = await aiBookingTools.bookSlot(context, {
          staffId: validatedData.staffId,
          appointmentTypeId: validatedData.appointmentTypeId,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          attendeeName: validatedData.attendeeName,
          attendeeEmail: validatedData.attendeeEmail,
          attendeePhone: validatedData.attendeePhone,
          title: validatedData.title,
          description: validatedData.description,
          locationDetails: validatedData.locationDetails,
          customFields: validatedData.customFields
        })
        break

      case 'reschedule_booking':
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required for reschedule_booking'
          }, { status: 401 })
        }
        result = await aiBookingTools.rescheduleBooking(context, {
          bookingId: validatedData.bookingId,
          newStartTime: validatedData.newStartTime,
          newEndTime: validatedData.newEndTime,
          reason: validatedData.reason
        })
        break

      case 'cancel_booking':
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required for cancel_booking'
          }, { status: 401 })
        }
        result = await aiBookingTools.cancelBooking(context, {
          bookingId: validatedData.bookingId,
          reason: validatedData.reason
        })
        break

      case 'get_booking':
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required for get_booking'
          }, { status: 401 })
        }
        result = await aiBookingTools.getBooking(context, validatedData.bookingId)
        break

      case 'get_bookings':
        if (!user) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required for get_bookings'
          }, { status: 401 })
        }
        result = await aiBookingTools.getOrganizationBookings(context, {
          status: validatedData.status,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          staffId: validatedData.staffId,
          limit: validatedData.limit,
          offset: validatedData.offset
        })
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in AI booking tools:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/ai/booking - Get available actions and documentation
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    description: 'AI Booking Tools API for Claude integration',
    actions: {
      find_availability: {
        description: 'Find available appointment slots',
        parameters: {
          organizationSlug: 'Organization identifier (optional if authenticated)',
          date: 'Specific date to check (YYYY-MM-DD)',
          dateRange: 'Date range with start and end dates',
          duration: 'Appointment duration in minutes (default: 30)',
          appointmentTypeId: 'Filter by specific appointment type',
          staffId: 'Filter by specific staff member',
          limit: 'Maximum number of slots to return'
        },
        authentication: 'Optional - public booking links supported'
      },
      book_slot: {
        description: 'Book an appointment slot',
        parameters: {
          organizationSlug: 'Organization identifier (optional if authenticated)',
          staffId: 'Staff member ID (required)',
          appointmentTypeId: 'Appointment type ID (required)',
          startTime: 'Start time in ISO format (required)',
          endTime: 'End time in ISO format (required)',
          attendeeName: 'Customer name (required)',
          attendeeEmail: 'Customer email (required)',
          attendeePhone: 'Customer phone (optional)',
          title: 'Custom appointment title (optional)',
          description: 'Appointment description (optional)',
          locationDetails: 'Location information (optional)',
          customFields: 'Additional custom data (optional)'
        },
        authentication: 'Optional - public booking supported'
      },
      reschedule_booking: {
        description: 'Reschedule an existing booking',
        parameters: {
          bookingId: 'Booking ID (required)',
          newStartTime: 'New start time in ISO format (required)',
          newEndTime: 'New end time in ISO format (required)',
          reason: 'Reason for rescheduling (optional)'
        },
        authentication: 'Required'
      },
      cancel_booking: {
        description: 'Cancel an existing booking',
        parameters: {
          bookingId: 'Booking ID (required)',
          reason: 'Reason for cancellation (optional)'
        },
        authentication: 'Required'
      },
      get_booking: {
        description: 'Get details of a specific booking',
        parameters: {
          bookingId: 'Booking ID (required)'
        },
        authentication: 'Required'
      },
      get_bookings: {
        description: 'Get list of bookings for an organization',
        parameters: {
          organizationSlug: 'Organization identifier (optional if authenticated)',
          status: 'Filter by booking status',
          startDate: 'Filter by start date',
          endDate: 'Filter by end date',
          staffId: 'Filter by staff member',
          limit: 'Maximum number of results',
          offset: 'Pagination offset'
        },
        authentication: 'Required'
      }
    },
    usage: {
      endpoint: '/api/ai/booking',
      method: 'POST',
      contentType: 'application/json',
      example: {
        action: 'find_availability',
        organizationSlug: 'my-gym',
        date: '2024-03-15',
        duration: 60,
        limit: 10
      }
    }
  })
}