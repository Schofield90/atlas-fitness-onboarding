const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createClassSessions() {
  console.log('🏋️ Creating sample class sessions for Atlas Fitness');

  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  try {
    // First get the Group PT program ID
    const { data: program } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('name', 'Group PT')
      .single();

    if (!program) {
      console.error('❌ No Group PT program found');
      return;
    }

    console.log('✅ Found program:', program.name, 'ID:', program.id);

    // Create sample class sessions for the week
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const sessions = [
      {
        name: 'Morning HIIT',
        program_id: program.id,
        organization_id: organizationId,
        occurrence_date: tomorrow.toISOString().split('T')[0],
        start_time: tomorrow.toISOString().split('T')[0] + 'T06:30:00',
        end_time: tomorrow.toISOString().split('T')[0] + 'T07:30:00',
        max_capacity: 12,
        capacity: 12,
        instructor_name: 'Sam Schofield',
        location: 'Main Studio',
        room_location: 'Main Studio',
        description: 'High intensity interval training to kickstart your day',
        duration_minutes: 60,
        session_status: 'scheduled'
      },
      {
        name: 'Strength & Conditioning',
        program_id: program.id,
        organization_id: organizationId,
        occurrence_date: tomorrow.toISOString().split('T')[0],
        start_time: tomorrow.toISOString().split('T')[0] + 'T09:00:00',
        end_time: tomorrow.toISOString().split('T')[0] + 'T10:00:00',
        max_capacity: 10,
        capacity: 10,
        instructor_name: 'Mike Johnson',
        location: 'Weight Room',
        room_location: 'Weight Room',
        description: 'Build strength and improve conditioning with compound movements',
        duration_minutes: 60,
        session_status: 'scheduled'
      },
      {
        name: 'Evening Circuit',
        program_id: program.id,
        organization_id: organizationId,
        occurrence_date: tomorrow.toISOString().split('T')[0],
        start_time: tomorrow.toISOString().split('T')[0] + 'T18:00:00',
        end_time: tomorrow.toISOString().split('T')[0] + 'T19:00:00',
        max_capacity: 15,
        capacity: 15,
        instructor_name: 'Sarah Williams',
        location: 'Main Studio',
        room_location: 'Main Studio',
        description: 'Full body circuit training session',
        duration_minutes: 60,
        session_status: 'scheduled'
      },
      {
        name: 'CrossFit WOD',
        program_id: program.id,
        organization_id: organizationId,
        occurrence_date: dayAfter.toISOString().split('T')[0],
        start_time: dayAfter.toISOString().split('T')[0] + 'T07:00:00',
        end_time: dayAfter.toISOString().split('T')[0] + 'T08:00:00',
        max_capacity: 8,
        capacity: 8,
        instructor_name: 'Tom Davis',
        location: 'CrossFit Box',
        room_location: 'CrossFit Box',
        description: 'Workout of the day - functional fitness at its finest',
        duration_minutes: 60,
        session_status: 'scheduled'
      },
      {
        name: 'Lunch Break Blast',
        program_id: program.id,
        organization_id: organizationId,
        occurrence_date: dayAfter.toISOString().split('T')[0],
        start_time: dayAfter.toISOString().split('T')[0] + 'T12:30:00',
        end_time: dayAfter.toISOString().split('T')[0] + 'T13:15:00',
        max_capacity: 10,
        capacity: 10,
        instructor_name: 'Emma Brown',
        location: 'Main Studio',
        room_location: 'Main Studio',
        description: '45 minute express workout perfect for lunch breaks',
        duration_minutes: 45,
        session_status: 'scheduled'
      }
    ];

    // Insert all sessions
    const { data: createdSessions, error } = await supabase
      .from('class_sessions')
      .insert(sessions)
      .select();

    if (error) {
      console.error('❌ Error creating sessions:', error);
    } else {
      console.log('✅ Created', createdSessions.length, 'class sessions');
      createdSessions.forEach(s => {
        console.log('  -', s.name, 'on', s.occurrence_date, 'at', s.start_time);
      });
    }

    // Also check the total count
    const { count } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    console.log('\n📊 Total class sessions for organization:', count);

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createClassSessions().then(() => process.exit(0));