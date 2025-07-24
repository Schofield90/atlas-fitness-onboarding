import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addDays, setHours, setMinutes, addHours } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Use service role for creating demo data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Use the Atlas Fitness demo organization ID
    const organizationId = '63589490-8f55-4157-bd3a-e141594b740e';

    // First, ensure the organization exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (!existingOrg) {
      // Create the demo organization
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: organizationId,
          name: 'Atlas Fitness Demo',
          email: 'demo@atlasfitness.com',
          subscription_plan: 'free',
          subscription_status: 'active',
          settings: {
            booking_window_days: 30,
            cancellation_hours: 24,
            max_bookings_per_customer: 10,
            website: 'https://atlas-fitness-demo.com',
            phone: '+1-555-ATLAS-FIT',
            address: '123 Fitness Street, Demo City, DC 12345',
            timezone: 'America/New_York'
          }
        });

      if (orgError) {
        console.error('Organization creation error:', orgError);
        return NextResponse.json(
          { error: 'Failed to create demo organization', details: orgError },
          { status: 500 }
        );
      }
    }

    // Check if programs already exist
    const { data: existingPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1);

    if (existingPrograms && existingPrograms.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Demo data already exists for this organization'
      });
    }

    // Create sample programs
    const programs = [
      {
        organization_id: organizationId,
        name: 'Morning HIIT Blast',
        description: 'Start your day with high-intensity interval training',
        price_pennies: 1500,
        max_participants: 15,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Strength & Conditioning',
        description: 'Build muscle and improve your strength',
        price_pennies: 2000,
        max_participants: 10,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Yoga Flow',
        description: 'Relaxing yoga for flexibility and mindfulness',
        price_pennies: 1200,
        max_participants: 20,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Free Trial Class',
        description: 'Try our gym with a complimentary session',
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
      console.error('Program creation error:', programError);
      return NextResponse.json(
        { error: 'Failed to create programs', details: programError },
        { status: 500 }
      );
    }

    // Create class sessions for the next 7 days
    const classSessions = [];
    const startDate = new Date();
    const rooms = ['Studio A', 'Studio B', 'Main Floor'];
    const trainerId = 'demo-trainer-id'; // Use a demo trainer ID

    for (const program of insertedPrograms) {
      // Create different time slots for each program
      const timeSlots = getTimeSlotsForProgram(program.name);

      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(startDate, day);
        
        for (const slot of timeSlots) {
          const startTime = setMinutes(setHours(currentDate, slot.hour), slot.minute);
          const endTime = addHours(startTime, 1); // 1-hour classes

          // Randomly make some classes nearly full
          const isBusy = Math.random() > 0.7;
          const maxCapacity = program.max_participants;
          const currentBookings = isBusy ? Math.floor(maxCapacity * 0.8) : 0;

          classSessions.push({
            organization_id: organizationId,
            program_id: program.id,
            trainer_id: trainerId,
            name: `${program.name} - ${slot.label}`,
            description: program.description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: maxCapacity,
            current_bookings: currentBookings,
            room_location: rooms[Math.floor(Math.random() * rooms.length)],
            session_status: 'scheduled'
          });
        }
      }
    }

    // Insert class sessions
    const { data: insertedSessions, error: sessionError } = await supabase
      .from('class_sessions')
      .insert(classSessions)
      .select();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create class sessions', details: sessionError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data created successfully',
      data: {
        programs: insertedPrograms.length,
        sessions: insertedSessions?.length || 0,
        organizationId
      }
    });

  } catch (error) {
    console.error('Error creating demo data:', error);
    return NextResponse.json(
      { error: 'Failed to create demo data', details: error },
      { status: 500 }
    );
  }
}

function getTimeSlotsForProgram(programName: string) {
  switch (programName) {
    case 'Morning HIIT Blast':
      return [
        { hour: 6, minute: 0, label: 'Early Morning' },
        { hour: 7, minute: 30, label: 'Morning' },
        { hour: 9, minute: 0, label: 'Mid-Morning' }
      ];
    case 'Strength & Conditioning':
      return [
        { hour: 12, minute: 0, label: 'Lunch' },
        { hour: 17, minute: 30, label: 'Evening' },
        { hour: 19, minute: 0, label: 'Late Evening' }
      ];
    case 'Yoga Flow':
      return [
        { hour: 6, minute: 30, label: 'Sunrise' },
        { hour: 10, minute: 0, label: 'Morning' },
        { hour: 18, minute: 0, label: 'Evening' }
      ];
    case 'Free Trial Class':
      return [
        { hour: 11, minute: 0, label: 'Morning' },
        { hour: 16, minute: 0, label: 'Afternoon' }
      ];
    default:
      return [{ hour: 10, minute: 0, label: 'Morning' }];
  }
}