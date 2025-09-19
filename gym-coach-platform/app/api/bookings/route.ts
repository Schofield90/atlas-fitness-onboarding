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

    // Build query for client sessions
    let query = supabase
      .from('client_sessions')
      .select(`
        *,
        client:client_id(id, name, email),
        trainer:trainer_id(name),
        coach:coach_id(name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters - if memberId is provided, it should be the auth user ID
    // We need to find the client record for this user
    if (memberId) {
      // For now, assume the memberId is the client_id directly
      // In a production system, you'd want to join through a user_clients table
      // or have a client record that references the auth user ID
      query = query.eq('client_id', memberId);
    } else {
      // If no memberId provided, filter by current user's client records
      // This assumes the client_id matches the auth user ID
      query = query.eq('client_id', user.id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ bookings: sessions || [] });

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
      session_type,
      title,
      start_time,
      end_time,
      trainer_id,
      coach_id,
      room_or_location,
      cost,
      payment_status = 'pending',
      session_notes,
      client_notes
    } = body;

    // Validate required fields
    if (!client_id || !session_type || !title || !start_time || !end_time) {
      return NextResponse.json({
        error: 'Missing required fields: client_id, session_type, title, start_time, end_time'
      }, { status: 400 });
    }

    // Get user's organization ID
    const { data: userOrg } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 });
    }

    // Create the session
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .insert({
        client_id,
        organization_id: userOrg.organization_id,
        session_type,
        title,
        start_time,
        end_time,
        trainer_id,
        coach_id,
        room_or_location,
        cost: cost || 0,
        payment_status,
        session_notes,
        client_notes,
        status: 'scheduled'
      })
      .select(`
        *,
        client:client_id(id, name, email),
        trainer:trainer_id(name),
        coach:coach_id(name)
      `)
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Session created successfully',
      session
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}