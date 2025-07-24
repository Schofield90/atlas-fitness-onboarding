import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Force use service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Service role key not configured',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-my-custom-header': 'force-create-data'
          }
        }
      }
    );

    // First, delete any existing data to start fresh
    await supabase.from('class_sessions').delete().eq('organization_id', organizationId);
    await supabase.from('programs').delete().eq('organization_id', organizationId);

    // Create programs WITHOUT explicit IDs (let database generate UUIDs)
    const programsToCreate = [
      {
        organization_id: organizationId,
        name: '6-Week Transformation Challenge',
        description: 'Our flagship program for beginners wanting to lose 12-25lbs',
        duration_weeks: 6,
        price_pennies: 19700,
        max_participants: 12,
        program_type: 'challenge',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        organization_id: organizationId,
        name: 'HIIT Blast',
        description: 'High-intensity interval training',
        price_pennies: 1500,
        max_participants: 15,
        program_type: 'ongoing',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        organization_id: organizationId,
        name: 'Free Trial Session',
        description: 'Try our gym for free',
        price_pennies: 0,
        max_participants: 8,
        program_type: 'trial',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Insert programs one by one to debug issues
    const createdPrograms = [];
    for (const program of programsToCreate) {
      const { data, error } = await supabase
        .from('programs')
        .insert(program)
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to create program ${program.name}:`, error);
      } else {
        createdPrograms.push(data);
      }
    }

    // Create sessions for tomorrow
    const sessionsToCreate = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date(tomorrow);
      sessionDate.setDate(tomorrow.getDate() + i);
      
      // Morning session
      const morningStart = new Date(sessionDate);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(morningStart);
      morningEnd.setHours(10, 0, 0, 0);
      
      // Evening session
      const eveningStart = new Date(sessionDate);
      eveningStart.setHours(18, 0, 0, 0);
      const eveningEnd = new Date(eveningStart);
      eveningEnd.setHours(19, 0, 0, 0);

      // Create sessions for each program (without explicit IDs)
      createdPrograms.forEach((program, index) => {
        sessionsToCreate.push({
          organization_id: organizationId,
          program_id: program.id,
          name: `${program.name} - Morning`,
          description: program.description,
          start_time: morningStart.toISOString(),
          end_time: morningEnd.toISOString(),
          max_capacity: program.max_participants,
          current_bookings: 0,
          room_location: 'Main Studio',
          session_status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        sessionsToCreate.push({
          organization_id: organizationId,
          program_id: program.id,
          name: `${program.name} - Evening`,
          description: program.description,
          start_time: eveningStart.toISOString(),
          end_time: eveningEnd.toISOString(),
          max_capacity: program.max_participants,
          current_bookings: Math.floor(Math.random() * 5),
          room_location: 'Main Studio',
          session_status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }

    // Insert sessions
    const { data: createdSessions, error: sessionError } = await supabase
      .from('class_sessions')
      .insert(sessionsToCreate)
      .select();

    // Verify what was created
    const { data: verifyPrograms } = await supabase
      .from('programs')
      .select('*')
      .eq('organization_id', organizationId);

    const { data: verifySessions } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('organization_id', organizationId);

    return NextResponse.json({
      success: true,
      message: 'Data force created',
      created: {
        programs: createdPrograms.length,
        sessions: createdSessions?.length || 0,
        programErrors: programsToCreate.length - createdPrograms.length,
        sessionError: sessionError?.message
      },
      verified: {
        programs: verifyPrograms?.length || 0,
        sessions: verifySessions?.length || 0
      },
      sampleSession: verifySessions?.[0],
      serviceKeyUsed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Force create error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}