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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ success: false, error: 'User organization not found' }, { status: 400 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sessionType = searchParams.get('sessionType');

    // Build query for class sessions
    let query = supabase
      .from('class_sessions')
      .select(`
        *,
        class_types(
          id,
          name,
          description,
          max_participants,
          default_capacity,
          duration,
          color
        ),
        trainers:trainer_id(id, name),
        rooms:room_id(id, name)
      `)
      .eq('organization_id', userData.organization_id)
      .order('start_time', { ascending: true });

    // Apply filters
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }
    if (sessionType && sessionType !== 'all') {
      query = query.eq('session_type', sessionType);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Format sessions for the frontend
    const formattedSessions = (sessions || []).map(session => ({
      id: session.id,
      title: session.title || session.class_types?.name || 'Class Session',
      start_time: session.start_time,
      end_time: session.end_time,
      session_type: session.session_type || 'gym_class',
      trainer_id: session.trainer_id,
      trainer_name: session.trainers?.name || session.instructor_name || '',
      location: session.rooms?.name || session.room_name || session.location || '',
      // Use the correct capacity field priority
      max_capacity: session.max_capacity || session.class_types?.max_participants || session.class_types?.default_capacity || 8,
      current_bookings: session.current_bookings || 0,
      base_cost: session.base_cost || 0,
      member_cost: session.member_cost || session.base_cost || 0,
      is_available: session.is_available !== false,
      notes: session.notes || '',
      is_cancelled: session.is_cancelled || false,
      session_status: session.session_status || 'scheduled',
      room_id: session.room_id,
      class_type_id: session.class_type_id,
      organization_id: session.organization_id,
      color: session.class_types?.color || '#3B82F6'
    }));

    return NextResponse.json({
      success: true,
      data: formattedSessions,
      meta: {
        total: formattedSessions.length,
        filters: {
          startDate,
          endDate,
          sessionType
        }
      }
    });

  } catch (error) {
    console.error('Error in class-sessions API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, ...updateData } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from('class_sessions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Error in update session API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    // Delete the session
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete session API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}