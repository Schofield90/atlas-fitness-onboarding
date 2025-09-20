const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function createSampleBookings() {
  try {
    console.log('Starting to create sample bookings...');
    
    // First, get some class sessions and clients for the organization
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('id, organization_id, start_time, end_time, name')
      .not('organization_id', 'is', null)
      .gte('start_time', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Last 60 days
      .limit(20);
    
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return;
    }
    
    console.log(`Found ${sessions.length} class sessions`);
    
    if (sessions.length === 0) {
      console.log('No class sessions found, cannot create bookings');
      return;
    }
    
    // Get clients for the organization
    const orgId = sessions[0].organization_id;
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('organization_id', orgId)
      .limit(10);
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return;
    }
    
    console.log(`Found ${clients.length} clients for organization ${orgId}`);
    
    if (clients.length === 0) {
      console.log('No clients found, cannot create bookings');
      return;
    }
    
    // Create sample bookings
    const bookings = [];
    
    sessions.forEach(session => {
      // Randomly select 1-3 clients to book this session
      const numBookings = Math.floor(Math.random() * 3) + 1;
      const shuffledClients = [...clients].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < Math.min(numBookings, shuffledClients.length); i++) {
        const client = shuffledClients[i];
        const rand = Math.random();
        
        bookings.push({
          organization_id: session.organization_id,
          client_id: client.id,
          class_session_id: session.id,
          booking_status: rand < 0.6 ? 'confirmed' : rand < 0.8 ? 'attended' : 'completed',
          booking_type: rand < 0.5 ? 'manual' : 'online',
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          attended_at: rand < 0.7 ? new Date(session.start_time).toISOString() : null
        });
      }
    });
    
    console.log(`Creating ${bookings.length} sample bookings...`);
    
    // Insert the bookings
    const { data: insertedBookings, error: insertError } = await supabase
      .from('class_bookings')
      .insert(bookings)
      .select();
    
    if (insertError) {
      console.error('Error inserting bookings:', insertError);
      return;
    }
    
    console.log(`Successfully created ${insertedBookings.length} sample bookings`);
    
    // Verify the data was inserted by checking the all_attendances view
    const { data: attendances, error: attendanceError } = await supabase
      .from('all_attendances')
      .select('customer_id, first_name, last_name, attendance_status')
      .eq('organization_id', orgId)
      .limit(10);
    
    if (attendanceError) {
      console.error('Error checking attendances view:', attendanceError);
    } else {
      console.log(`Found ${attendances.length} records in all_attendances view`);
      attendances.forEach(attendance => {
        console.log(`- ${attendance.first_name} ${attendance.last_name}: ${attendance.attendance_status}`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createSampleBookings();