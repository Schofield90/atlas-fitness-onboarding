import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, try to get ANY organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgError) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: orgError.message 
      }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      // Try to create a default organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Atlas Fitness Demo'
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ 
          error: 'No organizations found and could not create one', 
          details: createError.message 
        }, { status: 400 });
      }

      orgs.push(newOrg);
    }

    const organizationId = orgs[0].id;
    const organizationName = orgs[0].name;

    // Create sample programs
    const programs = [
      {
        organization_id: organizationId,
        name: 'Morning HIIT Blast',
        description: 'High-intensity interval training to kickstart your day',
        price_pennies: 1500,
        max_participants: 15,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Strength & Power',
        description: 'Build muscle and increase your strength with expert guidance',
        price_pennies: 2000,
        max_participants: 10,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Yoga Flow',
        description: 'Improve flexibility and find your inner peace',
        price_pennies: 1200,
        max_participants: 20,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Free Trial Session',
        description: 'Experience our gym with a complimentary trial class',
        price_pennies: 0,
        max_participants: 8,
        program_type: 'trial',
        is_active: true
      }
    ];

    // Insert programs
    const { data: insertedPrograms, error: programError } = await supabase
      .from('programs')
      .insert(programs)
      .select();

    if (programError) {
      return NextResponse.json({ 
        error: 'Failed to create programs', 
        details: programError.message,
        hint: 'Make sure the database migration has been run'
      }, { status: 500 });
    }

    // Create some sample class sessions
    const sessions = [];
    const today = new Date();
    const rooms = ['Studio A', 'Studio B', 'Main Floor'];

    if (insertedPrograms) {
      for (const program of insertedPrograms) {
        // Create 3 sessions per program over next 3 days
        for (let day = 0; day < 3; day++) {
          const date = new Date(today);
          date.setDate(date.getDate() + day);
          
          // Morning session
          const morningStart = new Date(date);
          morningStart.setHours(9, 0, 0, 0);
          const morningEnd = new Date(morningStart);
          morningEnd.setHours(10, 0, 0, 0);

          // Evening session
          const eveningStart = new Date(date);
          eveningStart.setHours(18, 0, 0, 0);
          const eveningEnd = new Date(eveningStart);
          eveningEnd.setHours(19, 0, 0, 0);

          sessions.push(
            {
              organization_id: organizationId,
              program_id: program.id,
              name: `${program.name} - Morning`,
              description: program.description,
              start_time: morningStart.toISOString(),
              end_time: morningEnd.toISOString(),
              max_capacity: program.max_participants,
              current_bookings: Math.floor(Math.random() * program.max_participants * 0.7),
              room_location: rooms[Math.floor(Math.random() * rooms.length)],
              session_status: 'scheduled'
            },
            {
              organization_id: organizationId,
              program_id: program.id,
              name: `${program.name} - Evening`,
              description: program.description,
              start_time: eveningStart.toISOString(),
              end_time: eveningEnd.toISOString(),
              max_capacity: program.max_participants,
              current_bookings: Math.floor(Math.random() * program.max_participants * 0.8),
              room_location: rooms[Math.floor(Math.random() * rooms.length)],
              session_status: 'scheduled'
            }
          );
        }
      }
    }

    // Insert sessions
    const { data: insertedSessions, error: sessionError } = await supabase
      .from('class_sessions')
      .insert(sessions)
      .select();

    if (sessionError) {
      return NextResponse.json({ 
        error: 'Failed to create class sessions', 
        details: sessionError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully!',
      organization: {
        id: organizationId,
        name: organizationName
      },
      data: {
        programs: insertedPrograms?.length || 0,
        sessions: insertedSessions?.length || 0
      },
      publicBookingUrl: `/book/public/${organizationId}`
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}