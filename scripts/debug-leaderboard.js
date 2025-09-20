const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function debugLeaderboard() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('=== DEBUGGING CUSTOMER LEADERBOARD ===');
  console.log('Organization ID:', organizationId);
  
  // Check class_bookings directly
  console.log('\n1. CHECKING CLASS_BOOKINGS TABLE:');
  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select('id, organization_id, client_id, booking_status, created_at, class_session_id')
    .eq('organization_id', organizationId)
    .limit(10);
  
  console.log('Bookings found:', bookings?.length || 0);
  console.log('Bookings error:', bookingsError);
  if (bookings) {
    bookings.forEach(booking => {
      console.log(`- Booking ${booking.id}: client_id=${booking.client_id}, status=${booking.booking_status}, session=${booking.class_session_id}`);
    });
  }
  
  // Check all_attendances view
  console.log('\n2. CHECKING ALL_ATTENDANCES VIEW:');
  const { data: attendances, error: attendancesError } = await supabase
    .from('all_attendances')
    .select('customer_id, first_name, last_name, attendance_status, class_start_at, organization_id')
    .eq('organization_id', organizationId)
    .limit(10);
  
  console.log('Attendances found:', attendances?.length || 0);
  console.log('Attendances error:', attendancesError);
  if (attendances) {
    attendances.forEach(att => {
      console.log(`- ${att.first_name} ${att.last_name}: ${att.attendance_status}, start: ${att.class_start_at}`);
    });
  }
  
  // Check date filtering
  console.log('\n3. CHECKING DATE FILTERING:');
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const now = new Date();
  
  console.log('Date range:', oneMonthAgo.toISOString(), 'to', now.toISOString());
  
  const { data: filteredAttendances, error: filteredError } = await supabase
    .from('all_attendances')
    .select('customer_id, first_name, last_name, attendance_status, class_start_at')
    .eq('organization_id', organizationId)
    .gte('class_start_at', oneMonthAgo.toISOString())
    .lte('class_start_at', now.toISOString())
    .limit(10);
  
  console.log('Filtered attendances found:', filteredAttendances?.length || 0);
  console.log('Filtered error:', filteredError);
  if (filteredAttendances) {
    filteredAttendances.forEach(att => {
      console.log(`- ${att.first_name} ${att.last_name}: ${att.attendance_status}, start: ${att.class_start_at}`);
    });
  }
  
  // Check without date filtering
  console.log('\n4. CHECKING WITHOUT DATE FILTERING:');
  const { data: allAttendances, error: allError } = await supabase
    .from('all_attendances')
    .select('customer_id, first_name, last_name, attendance_status, class_start_at')
    .eq('organization_id', organizationId)
    .not('customer_id', 'is', null)
    .limit(10);
  
  console.log('All attendances found:', allAttendances?.length || 0);
  console.log('All error:', allError);
  if (allAttendances) {
    allAttendances.forEach(att => {
      console.log(`- ${att.first_name} ${att.last_name}: ${att.attendance_status}, start: ${att.class_start_at}`);
    });
  }
  
  // Check clients table
  console.log('\n5. CHECKING CLIENTS TABLE:');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, organization_id')
    .eq('organization_id', organizationId)
    .limit(5);
  
  console.log('Clients found:', clients?.length || 0);
  console.log('Clients error:', clientsError);
  if (clients) {
    clients.forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name}: ${client.email}`);
    });
  }
  
  // Check class_sessions table
  console.log('\n6. CHECKING CLASS_SESSIONS TABLE:');
  const { data: sessions, error: sessionsError } = await supabase
    .from('class_sessions')
    .select('id, name, start_time, organization_id')
    .eq('organization_id', organizationId)
    .limit(5);
  
  console.log('Sessions found:', sessions?.length || 0);
  console.log('Sessions error:', sessionsError);
  if (sessions) {
    sessions.forEach(session => {
      console.log(`- ${session.name}: ${session.start_time}`);
    });
  }
}

debugLeaderboard().catch(console.error);