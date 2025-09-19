import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      client_id,
      sessions, // Array of { session_slot_id, date }
      payment_status = 'pending',
      notes
    } = body;

    // Validate required fields
    if (!client_id || !sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, sessions (array)' 
      }, { status: 400 });
    }

    // Validate each session
    for (const session of sessions) {
      if (!session.session_slot_id || !session.date) {
        return NextResponse.json({ 
          error: 'Each session must have session_slot_id and date' 
        }, { status: 400 });
      }
    }

    // Get session slot details for each booking
    const sessionSlotIds = sessions.map(s => s.session_slot_id);
    const { data: sessionSlots, error: slotsError } = await supabase
      .from('available_slots')
      .select('*')
      .in('id', sessionSlotIds);

    if (slotsError) {
      console.error('Error fetching session slots:', slotsError);
      return NextResponse.json({ error: 'Failed to fetch session slots' }, { status: 500 });
    }

    // Create booking data for each session
    const bookingsToCreate = sessions.map(session => {
      const sessionSlot = sessionSlots?.find(slot => slot.id === session.session_slot_id);
      
      if (!sessionSlot) {
        throw new Error(`Session slot not found: ${session.session_slot_id}`);
      }

      // Parse the session date and combine with the slot's time
      const sessionDate = new Date(session.date);
      const slotStartTime = new Date(sessionSlot.start_time);
      const slotEndTime = new Date(sessionSlot.end_time);
      
      // Create start and end times for the specific date using UTC
      const sessionStartTime = new Date(sessionDate);
      sessionStartTime.setUTCHours(slotStartTime.getUTCHours(), slotStartTime.getUTCMinutes(), 0, 0);

      const sessionEndTime = new Date(sessionDate);
      sessionEndTime.setUTCHours(slotEndTime.getUTCHours(), slotEndTime.getUTCMinutes(), 0, 0);

      return {
        client_id,
        session_slot_id: session.session_slot_id,
        session_start_time: sessionStartTime.toISOString(),
        session_end_time: sessionEndTime.toISOString(),
        cost: sessionSlot.member_cost || sessionSlot.base_cost || 0,
        payment_status,
        notes,
        booking_type: 'multiple',
        status: 'scheduled',
        cancellation_deadline: new Date(sessionStartTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        created_by: user.id
      };
    });

    // Create all bookings
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingsToCreate)
      .select(`
        *,
        client:client_id(id, name, email),
        session_slot:session_slot_id(
          id,
          title,
          start_time,
          end_time,
          slot_type,
          location,
          trainer:trainer_id(name),
          coach:coach_id(name)
        )
      `);

    if (bookingError) {
      console.error('Error creating multiple bookings:', bookingError);
      return NextResponse.json({ error: 'Failed to create bookings' }, { status: 500 });
    }

    // Update session slot booking counts for each unique session
    const uniqueSlotIds = [...new Set(sessionSlotIds)];
    for (const slotId of uniqueSlotIds) {
      const slotBookingCount = sessions.filter(s => s.session_slot_id === slotId).length;
      
      const { error: updateError } = await supabase
        .rpc('increment_session_bookings', { 
          slot_id: slotId, 
          increment_by: slotBookingCount 
        });
      
      if (updateError) {
        console.error('Error updating session booking count:', updateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      message: `Successfully created ${bookings?.length || 0} bookings`,
      bookings: bookings || [],
      count: bookings?.length || 0
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create multiple bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}