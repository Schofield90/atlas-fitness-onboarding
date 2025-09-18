const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
);

async function testCalendarData() {
  console.log('\n=== Testing Calendar Data ===\n');

  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  // Get date range for current week (Sep 14-20, 2025)
  const startDate = new Date('2025-09-14');
  const endDate = new Date('2025-09-20');
  endDate.setHours(23, 59, 59, 999);

  console.log('Date range:', {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });

  // Query 1: Check all class sessions for this org
  const { data: allClasses, error: allError } = await supabase
    .from('class_sessions')
    .select('id, start_time, instructor_name, location')
    .eq('organization_id', organizationId)
    .order('start_time', { ascending: true });

  if (allError) {
    console.error('Error fetching all classes:', allError);
  } else {
    console.log(`\nTotal classes for org: ${allClasses.length}`);
    console.log('Sample classes:', allClasses.slice(0, 3));
  }

  // Query 2: Check active classes in current week
  const { data: weekClasses, error: weekError } = await supabase
    .from('class_sessions')
    .select(`
      id,
      organization_id,
      program_id,
      trainer_id,
      start_time,
      end_time,
      duration_minutes,
      instructor_name,
      location,
      max_capacity,
      capacity,
      program:programs(name, description, price_pennies, max_participants, default_capacity),
      bookings:class_bookings!left(
        id,
        customer_id,
        booking_status,
        created_at
      )
    `)
    .eq('organization_id', organizationId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (weekError) {
    console.error('Error fetching week classes:', weekError);
  } else {
    console.log(`\nActive classes this week: ${weekClasses.length}`);
    if (weekClasses.length > 0) {
      console.log('\nFirst class details:', {
        id: weekClasses[0].id,
        start_time: weekClasses[0].start_time,
        instructor: weekClasses[0].instructor_name,
        location: weekClasses[0].location,
        capacity: weekClasses[0].max_capacity || weekClasses[0].capacity,
        program: weekClasses[0].program?.name,
        bookings: weekClasses[0].bookings?.length || 0
      });

      // Show time distribution
      const hourDistribution = {};
      weekClasses.forEach(cls => {
        const hour = new Date(cls.start_time).getHours();
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      });
      console.log('\nClasses by hour:', hourDistribution);
    }
  }

  // Query 3: Check if there are any future classes
  const { data: futureClasses, error: futureError } = await supabase
    .from('class_sessions')
    .select('id, start_time')
    .eq('organization_id', organizationId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  if (futureError) {
    console.error('Error fetching future classes:', futureError);
  } else {
    console.log(`\nNext 5 future classes:`, futureClasses.map(c => ({
      id: c.id,
      start: new Date(c.start_time).toLocaleString()
    })));
  }

  // Query 4: Check actual column structure
  const { data: sampleClass, error: structureError } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(1)
    .single();

  if (structureError && structureError.code !== 'PGRST116') { // Ignore "no rows" error
    console.error('Error fetching class structure:', structureError);
  } else if (sampleClass) {
    console.log(`\nSample class structure:`);
    console.log('Available columns:', Object.keys(sampleClass));
    console.log('Sample data:', sampleClass);
  }
}

testCalendarData().catch(console.error);