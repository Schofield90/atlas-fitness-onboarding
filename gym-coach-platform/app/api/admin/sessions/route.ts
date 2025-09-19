import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface SessionCreateData {
  title: string;
  start_time: string;
  end_time: string;
  session_type: 'gym_class' | 'personal_training' | 'coaching_call';
  trainer_id?: string;
  trainer_name?: string;
  location?: string;
  max_capacity: number;
  base_cost: number;
  member_cost?: number;
  notes?: string;
}

// GET /api/admin/sessions - Get all sessions with optional filters
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sessionType = searchParams.get('sessionType');
    const trainerId = searchParams.get('trainerId');

    // TODO: Replace with actual database query
    /*
    Example SQL query:
    SELECT
      cs.*,
      t.name as trainer_name,
      COUNT(b.id) as current_bookings
    FROM class_sessions cs
    LEFT JOIN trainers t ON cs.trainer_id = t.id
    LEFT JOIN bookings b ON cs.id = b.session_id AND b.status = 'confirmed'
    WHERE cs.organization_id = $1
      AND ($2::timestamp IS NULL OR cs.start_time >= $2)
      AND ($3::timestamp IS NULL OR cs.end_time <= $3)
      AND ($4::text IS NULL OR cs.session_type = $4)
      AND ($5::uuid IS NULL OR cs.trainer_id = $5)
    GROUP BY cs.id, t.name
    ORDER BY cs.start_time ASC;
    */

    // Mock data for now
    const mockSessions = [
      {
        id: '1',
        title: 'Morning HIIT',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
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
      },
      {
        id: '2',
        title: 'Yoga Flow',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 150 * 60 * 1000).toISOString(),
        session_type: 'gym_class',
        trainer_name: 'Emma Wilson',
        trainer_id: 'trainer-2',
        location: 'Studio B',
        max_capacity: 8,
        current_bookings: 6,
        base_cost: 12,
        member_cost: 8,
        is_available: true,
        notes: '',
        is_cancelled: false
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockSessions,
      meta: {
        total: mockSessions.length,
        filters: {
          startDate,
          endDate,
          sessionType,
          trainerId
        }
      }
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sessions - Create a new session
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionData: SessionCreateData = await request.json();

    // Validate required fields
    if (!sessionData.title || !sessionData.start_time || !sessionData.end_time) {
      return NextResponse.json(
        { success: false, error: 'Title, start time, and end time are required' },
        { status: 400 }
      );
    }

    if (!sessionData.session_type || !sessionData.max_capacity) {
      return NextResponse.json(
        { success: false, error: 'Session type and max capacity are required' },
        { status: 400 }
      );
    }

    // Validate times
    if (new Date(sessionData.start_time) >= new Date(sessionData.end_time)) {
      return NextResponse.json(
        { success: false, error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    if (sessionData.max_capacity < 1) {
      return NextResponse.json(
        { success: false, error: 'Max capacity must be at least 1' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database insertion
    /*
    Example SQL query:
    INSERT INTO class_sessions (
      id,
      title,
      start_time,
      end_time,
      session_type,
      trainer_id,
      trainer_name,
      location,
      max_capacity,
      base_cost,
      member_cost,
      notes,
      organization_id,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      NOW(), NOW()
    ) RETURNING *;
    */

    const newSession = {
      id: `session-${Date.now()}`,
      ...sessionData,
      current_bookings: 0,
      is_available: true,
      is_cancelled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newSession,
      message: 'Session created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}