import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for bookings
    let query = supabase
      .from('bookings')
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
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (memberId) {
      query = query.eq('client_id', memberId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('session_start_time', startDate);
    }
    if (endDate) {
      query = query.lte('session_start_time', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });

  } catch (error) {
    console.error('Error in bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      session_start_time,
      session_end_time,
      cost,
      payment_status = 'pending',
      notes,
      booking_type = 'single' // single, multiple, recurring
    } = body;

    // Validate required fields
    if (!client_id || !session_slot_id || !session_start_time || !session_end_time) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, session_slot_id, session_start_time, session_end_time' 
      }, { status: 400 });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id,
        session_slot_id,
        session_start_time,
        session_end_time,
        cost: cost || 0,
        payment_status,
        notes,
        booking_type,
        status: 'scheduled',
        cancellation_deadline: new Date(new Date(session_start_time).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours before
        created_by: user.id
      })
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
      `)
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Update session slot booking count (if applicable)
    if (session_slot_id) {
      const { error: updateError } = await supabase
        .rpc('increment_session_bookings', { slot_id: session_slot_id });
      
      if (updateError) {
        console.error('Error updating session booking count:', updateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      message: 'Booking created successfully',
      booking 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}