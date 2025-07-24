import { createClient } from '@supabase/supabase-js';
import { addDays, addHours, setHours, setMinutes } from 'date-fns';

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedBookingData() {
  console.log('🌱 Starting to seed booking data...');

  try {
    // Get the first organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('No organizations found. Please create an organization first.');
      return;
    }

    const organizationId = orgs[0].id;
    console.log(`Using organization ID: ${organizationId}`);

    // Get a trainer (any user will do for testing)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1);

    const trainerId = users?.[0]?.id || null;

    // Create sample programs
    const programs = [
      {
        organization_id: organizationId,
        name: '6-Week Body Transformation',
        description: 'Intensive 6-week program designed to transform your body through structured workouts and nutrition guidance.',
        duration_weeks: 6,
        price_pennies: 29900, // £299
        max_participants: 12,
        program_type: 'challenge',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'HIIT Blast',
        description: 'High-intensity interval training for maximum calorie burn and fitness gains.',
        duration_weeks: null,
        price_pennies: 1500, // £15 per class
        max_participants: 15,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Strength & Conditioning',
        description: 'Build muscle and improve your overall strength with our expert-led strength training program.',
        duration_weeks: null,
        price_pennies: 2000, // £20 per class
        max_participants: 10,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Yoga Flow',
        description: 'Improve flexibility, balance, and mental wellness through guided yoga sessions.',
        duration_weeks: null,
        price_pennies: 1200, // £12 per class
        max_participants: 20,
        program_type: 'ongoing',
        is_active: true
      },
      {
        organization_id: organizationId,
        name: 'Free Trial Session',
        description: 'Try our gym with a complimentary trial session. Experience our facilities and training style.',
        duration_weeks: null,
        price_pennies: 0, // Free
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
      console.error('Error inserting programs:', programError);
      return;
    }

    console.log(`✅ Created ${insertedPrograms.length} programs`);

    // Create class sessions for the next 2 weeks
    const classSessions = [];
    const startDate = new Date();
    const rooms = ['Studio A', 'Studio B', 'Main Floor', 'Yoga Room'];

    for (const program of insertedPrograms) {
      // Different schedule based on program
      let sessionsPerWeek = 0;
      let timeSlots: { hour: number; minute: number; duration: number }[] = [];

      switch (program.name) {
        case '6-Week Body Transformation':
          sessionsPerWeek = 3; // Mon, Wed, Fri
          timeSlots = [
            { hour: 6, minute: 0, duration: 60 },
            { hour: 18, minute: 30, duration: 60 }
          ];
          break;
        case 'HIIT Blast':
          sessionsPerWeek = 5; // Mon-Fri
          timeSlots = [
            { hour: 7, minute: 0, duration: 45 },
            { hour: 12, minute: 15, duration: 45 },
            { hour: 17, minute: 30, duration: 45 }
          ];
          break;
        case 'Strength & Conditioning':
          sessionsPerWeek = 4; // Mon, Tue, Thu, Sat
          timeSlots = [
            { hour: 8, minute: 0, duration: 60 },
            { hour: 19, minute: 0, duration: 60 }
          ];
          break;
        case 'Yoga Flow':
          sessionsPerWeek = 6; // Every day except Sunday
          timeSlots = [
            { hour: 6, minute: 30, duration: 60 },
            { hour: 9, minute: 0, duration: 60 },
            { hour: 18, minute: 0, duration: 60 }
          ];
          break;
        case 'Free Trial Session':
          sessionsPerWeek = 2; // Tue, Thu
          timeSlots = [
            { hour: 10, minute: 0, duration: 60 },
            { hour: 16, minute: 0, duration: 60 }
          ];
          break;
      }

      // Generate sessions for the next 14 days
      for (let day = 0; day < 14; day++) {
        const currentDate = addDays(startDate, day);
        const dayOfWeek = currentDate.getDay();

        // Skip days based on program schedule
        if (program.name === '6-Week Body Transformation' && ![1, 3, 5].includes(dayOfWeek)) continue;
        if (program.name === 'HIIT Blast' && [0, 6].includes(dayOfWeek)) continue;
        if (program.name === 'Strength & Conditioning' && ![1, 2, 4, 6].includes(dayOfWeek)) continue;
        if (program.name === 'Yoga Flow' && dayOfWeek === 0) continue;
        if (program.name === 'Free Trial Session' && ![2, 4].includes(dayOfWeek)) continue;

        // Create sessions for each time slot
        for (const slot of timeSlots) {
          const startTime = setMinutes(setHours(currentDate, slot.hour), slot.minute);
          const endTime = addHours(startTime, slot.duration / 60);

          // Vary capacity to make some classes nearly full
          const baseCapacity = program.max_participants;
          const capacity = Math.random() > 0.7 ? Math.floor(baseCapacity * 0.6) : baseCapacity;
          const currentBookings = Math.random() > 0.5 ? Math.floor(capacity * Math.random() * 0.9) : 0;

          classSessions.push({
            organization_id: organizationId,
            program_id: program.id,
            trainer_id: trainerId,
            name: `${program.name} - ${slot.hour < 12 ? 'Morning' : slot.hour < 17 ? 'Afternoon' : 'Evening'}`,
            description: program.description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: capacity,
            current_bookings: currentBookings,
            room_location: rooms[Math.floor(Math.random() * rooms.length)],
            session_status: 'scheduled',
            repeat_pattern: null
          });
        }
      }
    }

    // Insert class sessions in batches
    const batchSize = 50;
    let totalSessionsCreated = 0;

    for (let i = 0; i < classSessions.length; i += batchSize) {
      const batch = classSessions.slice(i, i + batchSize);
      const { data: insertedSessions, error: sessionError } = await supabase
        .from('class_sessions')
        .insert(batch)
        .select();

      if (sessionError) {
        console.error('Error inserting class sessions:', sessionError);
        continue;
      }

      totalSessionsCreated += insertedSessions?.length || 0;
      console.log(`Progress: ${totalSessionsCreated}/${classSessions.length} sessions created`);
    }

    console.log(`✅ Created ${totalSessionsCreated} class sessions`);

    // Create some sample bookings for testing
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(5);

    if (leads && leads.length > 0) {
      const { data: upcomingSessions, error: upcomingError } = await supabase
        .from('class_sessions')
        .select('id, current_bookings, max_capacity')
        .eq('organization_id', organizationId)
        .gte('start_time', new Date().toISOString())
        .lt('current_bookings', 10) // Less than 10 to ensure some space
        .limit(10);

      if (upcomingSessions && upcomingSessions.length > 0) {
        const bookings = [];
        
        for (let i = 0; i < Math.min(leads.length, upcomingSessions.length); i++) {
          bookings.push({
            customer_id: leads[i].id,
            class_session_id: upcomingSessions[i].id,
            booking_status: 'confirmed',
            payment_status: 'paid'
          });
        }

        const { data: insertedBookings, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookings)
          .select();

        if (!bookingError) {
          console.log(`✅ Created ${insertedBookings?.length || 0} sample bookings`);
        }
      }
    }

    console.log('🎉 Seeding completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Navigate to http://localhost:3000/booking');
    console.log('2. View available classes on the calendar');
    console.log('3. Click on classes to book them');
    console.log('4. Check the "My Bookings" tab to see your bookings');

  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

// Run the seeding function
seedBookingData();