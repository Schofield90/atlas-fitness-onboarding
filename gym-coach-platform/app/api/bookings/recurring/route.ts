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
      session_slot_id,
      start_date,
      end_date,
      frequency, // 'weekly' | 'monthly'
      days_of_week, // array of day numbers (0 = Sunday, 1 = Monday, etc.)
      occurrences,
      cost_per_session,
      payment_status = 'pending',
      notes
    } = body;

    // Validate required fields
    if (!client_id || !session_slot_id || !start_date || !frequency || !occurrences) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, session_slot_id, start_date, frequency, occurrences' 
      }, { status: 400 });
    }

    // Get the session slot details to use as template
    const { data: sessionSlot, error: slotError } = await supabase
      .from('available_slots')
      .select('*')
      .eq('id', session_slot_id)
      .single();

    if (slotError || !sessionSlot) {
      return NextResponse.json({ error: 'Session slot not found' }, { status: 404 });
    }

    // Generate recurring booking dates
    const bookingDates = generateRecurringDates(
      new Date(start_date),
      end_date ? new Date(end_date) : null,
      frequency,
      days_of_week || [],
      occurrences,
      sessionSlot
    );

    if (bookingDates.length === 0) {
      return NextResponse.json({ error: 'No valid booking dates generated' }, { status: 400 });
    }

    // Create all bookings in a transaction
    const bookingsToCreate = bookingDates.map(date => ({
      client_id,
      session_slot_id,
      session_start_time: date.start_time,
      session_end_time: date.end_time,
      cost: cost_per_session || sessionSlot.member_cost || sessionSlot.base_cost,
      payment_status,
      notes,
      booking_type: 'recurring',
      status: 'scheduled',
      cancellation_deadline: new Date(date.start_time.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      created_by: user.id
    }));

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
      console.error('Error creating recurring bookings:', bookingError);
      return NextResponse.json({ error: 'Failed to create recurring bookings' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Successfully created ${bookings?.length || 0} recurring bookings`,
      bookings: bookings || [],
      count: bookings?.length || 0
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create recurring booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateRecurringDates(
  startDate: Date,
  endDate: Date | null,
  frequency: 'weekly' | 'monthly',
  daysOfWeek: number[],
  maxOccurrences: number,
  sessionSlot: any
): { start_time: Date; end_time: Date }[] {
  const dates: { start_time: Date; end_time: Date }[] = [];
  const sessionStartTime = new Date(sessionSlot.start_time);
  const sessionEndTime = new Date(sessionSlot.end_time);
  
  // Get the duration of the session
  const sessionDuration = sessionEndTime.getTime() - sessionStartTime.getTime();
  
  // Get the time of day from the session slot using UTC
  const sessionHour = sessionStartTime.getUTCHours();
  const sessionMinute = sessionStartTime.getUTCMinutes();
  
  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  // Set the time to match the session slot using UTC
  currentDate.setUTCHours(sessionHour, sessionMinute, 0, 0);

  while (occurrenceCount < maxOccurrences && (!endDate || currentDate <= endDate)) {
    if (frequency === 'weekly') {
      // For weekly, check if current day matches any of the specified days
      const currentDayOfWeek = currentDate.getDay();
      
      if (daysOfWeek.length === 0 || daysOfWeek.includes(currentDayOfWeek)) {
        const startTime = new Date(currentDate);
        const endTime = new Date(startTime.getTime() + sessionDuration);
        
        dates.push({ start_time: startTime, end_time: endTime });
        occurrenceCount++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      
    } else if (frequency === 'monthly') {
      // For monthly, use the same day of the month
      const startTime = new Date(currentDate);
      const endTime = new Date(startTime.getTime() + sessionDuration);
      
      dates.push({ start_time: startTime, end_time: endTime });
      occurrenceCount++;
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Safety check to prevent infinite loops
    if (dates.length > 100) {
      console.warn('Reached maximum booking limit of 100 for safety');
      break;
    }
  }

  return dates;
}