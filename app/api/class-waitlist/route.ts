import { createClient } from '@/app/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const addToWaitlistSchema = z.object({
  organization_id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  client_id: z.string().uuid(),
  auto_book: z.boolean().default(true),
  priority_score: z.number().int().default(0), // Higher score = higher priority
  expires_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

const updateWaitlistSchema = z.object({
  waitlist_id: z.string().uuid(),
  auto_book: z.boolean().optional(),
  priority_score: z.number().int().optional(),
  status: z.enum(['waiting', 'converted', 'expired']).optional()
})

// Helper function to get next waitlist position
const getNextWaitlistPosition = async (supabase: any, scheduleId: string) => {
  const { data } = await supabase
    .from('class_waitlist')
    .select('position')
    .eq('schedule_id', scheduleId)
    .eq('status', 'waiting')
    .order('position', { ascending: false })
    .limit(1)

  return data && data.length > 0 ? data[0].position + 1 : 1
}

// Helper function to reorder waitlist positions
const reorderWaitlistPositions = async (supabase: any, scheduleId: string) => {
  const { data: waitlistEntries } = await supabase
    .from('class_waitlist')
    .select('id')
    .eq('schedule_id', scheduleId)
    .eq('status', 'waiting')
    .order('priority_score', { ascending: false })
    .order('joined_at', { ascending: true })

  if (waitlistEntries) {
    for (let i = 0; i < waitlistEntries.length; i++) {
      await supabase
        .from('class_waitlist')
        .update({ position: i + 1 })
        .eq('id', waitlistEntries[i].id)
    }
  }
}

// Helper function to process waitlist when spots become available
const processWaitlistForSchedule = async (supabase: any, scheduleId: string) => {
  // Get schedule details
  const { data: schedule } = await supabase
    .from('class_schedules')
    .select('max_capacity, current_bookings, organization_id')
    .eq('id', scheduleId)
    .single()

  if (!schedule || schedule.current_bookings >= schedule.max_capacity) {
    return []
  }

  const availableSpots = schedule.max_capacity - schedule.current_bookings
  
  // Get next people on waitlist ordered by priority and join time
  const { data: waitlistEntries } = await supabase
    .from('class_waitlist')
    .select(`
      *,
      client:clients(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('schedule_id', scheduleId)
    .eq('status', 'waiting')
    .order('priority_score', { ascending: false })
    .order('joined_at', { ascending: true })
    .limit(availableSpots)

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return []
  }

  const processedBookings = []

  for (const entry of waitlistEntries) {
    if (entry.auto_book) {
      // Create automatic booking
      const { data: booking, error: bookingError } = await supabase
        .from('class_bookings')
        .insert({
          organization_id: schedule.organization_id,
          schedule_id: scheduleId,
          client_id: entry.client_id,
          booking_type: 'single',
          status: 'confirmed',
          payment_status: 'succeeded', // Assume payment handled elsewhere
          payment_amount_pennies: 0,
          notes: 'Auto-booked from waitlist'
        })
        .select()
        .single()

      if (!bookingError && booking) {
        // Update waitlist entry status
        await supabase
          .from('class_waitlist')
          .update({ 
            status: 'converted',
            notification_sent: false // Will trigger notification
          })
          .eq('id', entry.id)

        processedBookings.push({
          booking,
          waitlist_entry: entry,
          client: entry.client
        })
      }
    } else {
      // Just notify (don't auto-book)
      await supabase
        .from('class_waitlist')
        .update({ notification_sent: false }) // Will trigger notification
        .eq('id', entry.id)

      processedBookings.push({
        booking: null,
        waitlist_entry: entry,
        client: entry.client,
        notification_only: true
      })
    }
  }

  // Reorder remaining waitlist
  await reorderWaitlistPositions(supabase, scheduleId)

  return processedBookings
}

// GET - List waitlist entries
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const scheduleId = searchParams.get('schedule_id')
    const clientId = searchParams.get('client_id')
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('class_waitlist')
      .select(`
        *,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        schedule:class_schedules(
          id,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          class_type:class_types(*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('position', { ascending: true })

    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error fetching waitlist entries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch waitlist entries' },
      { status: 500 }
    )
  }
}

// POST - Add to waitlist
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const validated = addToWaitlistSchema.parse(body)

    // Check if class exists
    const { data: schedule, error: scheduleError } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('id', validated.schedule_id)
      .eq('organization_id', validated.organization_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check if class is actually full
    if (schedule.current_bookings < schedule.max_capacity) {
      return NextResponse.json(
        { success: false, error: 'Class still has available spots' },
        { status: 400 }
      )
    }

    // Check if waitlist is enabled for this class
    if (!schedule.waitlist_enabled) {
      return NextResponse.json(
        { success: false, error: 'Waitlist is not enabled for this class' },
        { status: 400 }
      )
    }

    // Check if client is already on waitlist
    const { data: existingWaitlist } = await supabase
      .from('class_waitlist')
      .select('id')
      .eq('schedule_id', validated.schedule_id)
      .eq('client_id', validated.client_id)
      .eq('status', 'waiting')
      .single()

    if (existingWaitlist) {
      return NextResponse.json(
        { success: false, error: 'Client is already on waitlist for this class' },
        { status: 400 }
      )
    }

    // Check if client is already booked
    const { data: existingBooking } = await supabase
      .from('class_bookings')
      .select('id')
      .eq('schedule_id', validated.schedule_id)
      .eq('client_id', validated.client_id)
      .eq('status', 'confirmed')
      .single()

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Client is already booked for this class' },
        { status: 400 }
      )
    }

    // Get next position
    const position = await getNextWaitlistPosition(supabase, validated.schedule_id)

    // Add to waitlist
    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('class_waitlist')
      .insert({
        organization_id: validated.organization_id,
        schedule_id: validated.schedule_id,
        client_id: validated.client_id,
        position: position,
        auto_book: validated.auto_book,
        priority_score: validated.priority_score,
        expires_at: validated.expires_at,
        status: 'waiting',
        metadata: validated.metadata,
        notification_sent: false
      })
      .select(`
        *,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        schedule:class_schedules(
          id,
          start_time,
          end_time,
          class_type:class_types(*)
        )
      `)
      .single()

    if (waitlistError) throw waitlistError

    // If priority score is higher than existing entries, reorder
    if (validated.priority_score > 0) {
      await reorderWaitlistPositions(supabase, validated.schedule_id)
    }

    return NextResponse.json({
      success: true,
      data: waitlistEntry
    })

  } catch (error) {
    console.error('Error adding to waitlist:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add to waitlist' },
      { status: 500 }
    )
  }
}

// PUT - Update waitlist entry
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const validated = updateWaitlistSchema.parse(body)

    // Get current waitlist entry
    const { data: currentEntry, error: fetchError } = await supabase
      .from('class_waitlist')
      .select('*')
      .eq('id', validated.waitlist_id)
      .single()

    if (fetchError || !currentEntry) {
      return NextResponse.json(
        { success: false, error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Update the entry
    const updateData = Object.fromEntries(
      Object.entries(validated).filter(([key, value]) => key !== 'waitlist_id' && value !== undefined)
    )

    const { data: updatedEntry, error: updateError } = await supabase
      .from('class_waitlist')
      .update(updateData)
      .eq('id', validated.waitlist_id)
      .select(`
        *,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        schedule:class_schedules(
          id,
          start_time,
          end_time,
          class_type:class_types(*)
        )
      `)
      .single()

    if (updateError) throw updateError

    // If priority score changed, reorder waitlist
    if (validated.priority_score !== undefined && validated.priority_score !== currentEntry.priority_score) {
      await reorderWaitlistPositions(supabase, currentEntry.schedule_id)
    }

    return NextResponse.json({
      success: true,
      data: updatedEntry
    })

  } catch (error) {
    console.error('Error updating waitlist entry:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update waitlist entry' },
      { status: 500 }
    )
  }
}

// DELETE - Remove from waitlist
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const waitlistId = searchParams.get('waitlist_id')

    if (!waitlistId) {
      return NextResponse.json(
        { success: false, error: 'waitlist_id is required' },
        { status: 400 }
      )
    }

    // Get waitlist entry details for reordering
    const { data: entry, error: fetchError } = await supabase
      .from('class_waitlist')
      .select('schedule_id')
      .eq('id', waitlistId)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Delete the entry
    const { error: deleteError } = await supabase
      .from('class_waitlist')
      .delete()
      .eq('id', waitlistId)

    if (deleteError) throw deleteError

    // Reorder remaining waitlist positions
    await reorderWaitlistPositions(supabase, entry.schedule_id)

    // Check if any spots opened up and process waitlist
    const processed = await processWaitlistForSchedule(supabase, entry.schedule_id)

    return NextResponse.json({
      success: true,
      message: 'Removed from waitlist successfully',
      processed_entries: processed
    })

  } catch (error) {
    console.error('Error removing from waitlist:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to remove from waitlist' },
      { status: 500 }
    )
  }
}

// POST - Process waitlist (manual trigger)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { schedule_id } = body

    if (!schedule_id) {
      return NextResponse.json(
        { success: false, error: 'schedule_id is required' },
        { status: 400 }
      )
    }

    const processed = await processWaitlistForSchedule(supabase, schedule_id)

    return NextResponse.json({
      success: true,
      message: `Processed ${processed.length} waitlist entries`,
      data: processed
    })

  } catch (error) {
    console.error('Error processing waitlist:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to process waitlist' },
      { status: 500 }
    )
  }
}