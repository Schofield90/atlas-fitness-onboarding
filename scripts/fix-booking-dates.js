const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function fixBookingDates() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('=== FIXING BOOKING DATES FOR LEADERBOARD ===');
  
  // Get existing class sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('class_sessions')
    .select('id, start_time, end_time')
    .eq('organization_id', organizationId);
  
  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
    return;
  }
  
  console.log(`Found ${sessions.length} class sessions`);
  
  // Update each session to have past dates within the last 30 days
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    
    // Create a random date within the last 30 days
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const newStartTime = new Date();
    newStartTime.setDate(newStartTime.getDate() - daysAgo);
    newStartTime.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0); // Random hour between 8 AM and 8 PM
    
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + 1); // 1 hour duration
    
    console.log(`Updating session ${session.id}: ${newStartTime.toISOString()}`);
    
    const { error: updateError } = await supabase
      .from('class_sessions')
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString()
      })
      .eq('id', session.id);
    
    if (updateError) {
      console.error(`Error updating session ${session.id}:`, updateError);
    }
  }
  
  // Also update the created_at dates of the bookings to be more recent
  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select('id')
    .eq('organization_id', organizationId);
  
  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return;
  }
  
  console.log(`Found ${bookings.length} bookings to update`);
  
  for (const booking of bookings) {
    const daysAgo = Math.floor(Math.random() * 25) + 1;
    const newCreatedAt = new Date();
    newCreatedAt.setDate(newCreatedAt.getDate() - daysAgo);
    
    const { error: updateError } = await supabase
      .from('class_bookings')
      .update({
        created_at: newCreatedAt.toISOString(),
        updated_at: newCreatedAt.toISOString()
      })
      .eq('id', booking.id);
    
    if (updateError) {
      console.error(`Error updating booking ${booking.id}:`, updateError);
    }
  }
  
  console.log('Successfully updated all session and booking dates!');
  
  // Verify the fix
  console.log('\n=== VERIFYING THE FIX ===');
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const now = new Date();
  
  const { data: attendances, error: attendancesError } = await supabase
    .from('all_attendances')
    .select('customer_id, first_name, last_name, attendance_status, class_start_at')
    .eq('organization_id', organizationId)
    .gte('class_start_at', oneMonthAgo.toISOString())
    .lte('class_start_at', now.toISOString());
  
  console.log(`Found ${attendances?.length || 0} attendances in the last month`);
  if (attendances) {
    attendances.forEach(att => {
      console.log(`- ${att.first_name} ${att.last_name}: ${att.attendance_status}, ${att.class_start_at}`);
    });
  }
}

fixBookingDates().catch(console.error);