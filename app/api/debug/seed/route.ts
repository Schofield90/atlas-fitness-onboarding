import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Use service role key to bypass RLS
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

    // Create sample programs based on your successful models
    const programs = [
      {
        organization_id: organizationId,
        name: '6-Week Transformation Challenge',
        description: 'Our flagship program for beginners wanting to lose 12-25lbs',
        duration_weeks: 6,
        price_pennies: 19700, // £197
        max_participants: 12,
        program_type: 'challenge',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: '28-Day Kickstart',
        description: 'Quick wins for busy professionals',
        duration_weeks: 4,
        price_pennies: 14700, // £147
        max_participants: 10,
        program_type: 'challenge',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'HIIT Blast',
        description: 'High-intensity interval training for maximum results',
        price_pennies: 1500, // £15 per class
        max_participants: 15,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Free Trial Session',
        description: 'Experience our gym with a complimentary trial class',
        price_pennies: 0, // Free
        max_participants: 8,
        program_type: 'trial',
        is_active: true
      }
    ];

    const { data: createdPrograms, error: programError } = await supabase
      .from('programs')
      .insert(programs)
      .select();

    if (programError) {
      return NextResponse.json({ 
        error: 'Failed to create programs', 
        details: programError.message 
      }, { status: 500 });
    }

    // Create sample class sessions for next 2 weeks
    const classSessions = [];
    const startDate = new Date();
    
    for (let i = 0; i < 14; i++) {
      const classDate = new Date(startDate);
      classDate.setDate(startDate.getDate() + i);
      
      // Skip weekends for this example
      if (classDate.getDay() === 0 || classDate.getDay() === 6) continue;
      
      // Create sessions for each program
      for (const program of createdPrograms || []) {
        // Morning class
        const morningStart = new Date(classDate);
        morningStart.setHours(9, 0, 0, 0);
        const morningEnd = new Date(morningStart);
        morningEnd.setHours(10, 0, 0, 0);
        
        // Evening class
        const eveningStart = new Date(classDate);
        eveningStart.setHours(18, 0, 0, 0);
        const eveningEnd = new Date(eveningStart);
        eveningEnd.setHours(19, 0, 0, 0);
        
        // Only create 2 sessions per program per day to avoid too many classes
        if (program.name.includes('6-Week') || program.name.includes('HIIT')) {
          classSessions.push(
            {
              organization_id: organizationId,
              program_id: program.id,
              name: `${program.name} - Morning`,
              description: program.description,
              start_time: morningStart.toISOString(),
              end_time: morningEnd.toISOString(),
              max_capacity: program.max_participants,
              current_bookings: Math.floor(Math.random() * program.max_participants * 0.6), // Random bookings
              room_location: 'Main Studio',
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
              room_location: 'Main Studio',
              session_status: 'scheduled'
            }
          );
        }
      }
    }

    const { data: createdSessions, error: sessionError } = await supabase
      .from('class_sessions')
      .insert(classSessions)
      .select();

    if (sessionError) {
      return NextResponse.json({ 
        error: 'Failed to create sessions', 
        details: sessionError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Seed data created successfully',
      programs: createdPrograms?.length || 0,
      sessions: createdSessions?.length || 0,
      publicBookingUrl: `https://atlas-fitness-onboarding.vercel.app/book/public/${organizationId}`,
      adminBookingUrl: `https://atlas-fitness-onboarding.vercel.app/booking/admin`
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}