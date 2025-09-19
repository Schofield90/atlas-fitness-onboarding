import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface SessionUpdateData {
  title?: string;
  start_time?: string;
  end_time?: string;
  session_type?: 'gym_class' | 'personal_training' | 'coaching_call';
  trainer_id?: string;
  trainer_name?: string;
  location?: string;
  max_capacity?: number;
  base_cost?: number;
  member_cost?: number;
  notes?: string;
  is_cancelled?: boolean;
}

// GET /api/admin/sessions/[id] - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.id;

    // TODO: Replace with actual database query
    // Example response structure
    const mockSession = {
      id: sessionId,
      title: 'Morning HIIT',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      session_type: 'gym_class',
      trainer_name: 'Sarah Johnson',
      trainer_id: 'trainer-1',
      location: 'Studio A',
      max_capacity: 8,
      current_bookings: 5,
      base_cost: 15,
      member_cost: 10,
      is_available: true,
      notes: '',
      is_cancelled: false
    };

    return NextResponse.json({
      success: true,
      data: mockSession
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/sessions/[id] - Update a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.id;
    const updateData: SessionUpdateData = await request.json();

    // Validate required fields
    if (updateData.max_capacity !== undefined && updateData.max_capacity < 1) {
      return NextResponse.json(
        { success: false, error: 'Max capacity must be at least 1' },
        { status: 400 }
      );
    }

    if (updateData.start_time && updateData.end_time) {
      if (new Date(updateData.start_time) >= new Date(updateData.end_time)) {
        return NextResponse.json(
          { success: false, error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    // TODO: Replace with actual database update
    /*
    Example SQL query:
    UPDATE class_sessions
    SET
      title = COALESCE($1, title),
      start_time = COALESCE($2, start_time),
      end_time = COALESCE($3, end_time),
      session_type = COALESCE($4, session_type),
      trainer_id = COALESCE($5, trainer_id),
      trainer_name = COALESCE($6, trainer_name),
      location = COALESCE($7, location),
      max_capacity = COALESCE($8, max_capacity),
      base_cost = COALESCE($9, base_cost),
      member_cost = COALESCE($10, member_cost),
      notes = COALESCE($11, notes),
      is_cancelled = COALESCE($12, is_cancelled),
      updated_at = NOW()
    WHERE id = $13 AND organization_id = $14
    RETURNING *;
    */

    // Mock response
    const updatedSession = {
      id: sessionId,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // If capacity was reduced, check if it's below current bookings
    if (updateData.max_capacity !== undefined) {
      // TODO: Query actual current bookings from database
      const currentBookings = 5; // Mock value

      if (updateData.max_capacity < currentBookings) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot reduce capacity below current bookings (${currentBookings})`
          },
          { status: 400 }
        );
      }
    }

    // If session is being cancelled, notify participants
    if (updateData.is_cancelled === true) {
      // TODO: Add notification logic
      console.log(`Session ${sessionId} has been cancelled. Notifying participants...`);
    }

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.id;

    // TODO: Check if session has bookings
    const hasBookings = false; // Mock check

    if (hasBookings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete session with existing bookings. Cancel the session instead.'
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database deletion
    /*
    Example SQL query:
    DELETE FROM class_sessions
    WHERE id = $1 AND organization_id = $2
    RETURNING id;
    */

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}