const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function checkGoTeamUpData() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('=== CHECKING FOR GOTEAMUP IMPORTED DATA ===');
  console.log('Organization ID:', organizationId);
  
  // Check for any tables that might contain GoTeamUp data
  console.log('\n1. CHECKING CLIENTS FOR IMPORTED DATA:');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, created_at, external_id, source, notes')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('Clients found:', clients?.length || 0);
  if (clients) {
    clients.forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name} (${client.email}): created ${client.created_at}, source: ${client.source}, external_id: ${client.external_id}`);
    });
  }
  
  // Check for attendance-related tables
  console.log('\n2. CHECKING ALL TABLES FOR ATTENDANCE DATA:');
  
  // Check for any attendance or history tables
  const potentialTables = [
    'attendance_records',
    'class_attendance', 
    'booking_history',
    'client_attendance_history',
    'goteamup_attendance',
    'goteamup_imports',
    'attendance_imports',
    'client_visits',
    'client_checkins',
    'member_visits',
    'class_participations'
  ];
  
  for (const tableName of potentialTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error && data) {
        console.log(`✓ Found table: ${tableName} (${data.length} sample records)`);
        
        // Get more details about this table
        const { data: fullData, error: fullError } = await supabase
          .from(tableName)
          .select('*')
          .eq('organization_id', organizationId)
          .limit(5);
        
        if (fullData && fullData.length > 0) {
          console.log(`  Data in ${tableName}:`, fullData);
        }
      }
    } catch (e) {
      // Table doesn't exist, continue
    }
  }
  
  // Check for any columns that might indicate GoTeamUp import
  console.log('\n3. CHECKING CLASS_BOOKINGS FOR IMPORT INDICATORS:');
  const { data: bookingsWithDetails, error: bookingsDetailsError } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(5);
  
  console.log('Bookings with full details:', bookingsWithDetails);
  
  // Check clients table for last_visit_date
  console.log('\n4. CHECKING CLIENTS LAST_VISIT_DATE:');
  const { data: clientsWithVisits, error: visitsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, last_visit_date, created_at')
    .eq('organization_id', organizationId)
    .not('last_visit_date', 'is', null)
    .order('last_visit_date', { ascending: false })
    .limit(10);
  
  console.log('Clients with visit history:', clientsWithVisits?.length || 0);
  if (clientsWithVisits) {
    clientsWithVisits.forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name}: last visit ${client.last_visit_date}`);
    });
  }
  
  // Check for migration-related tables
  console.log('\n5. CHECKING MIGRATION TABLES:');
  try {
    const { data: migrationData, error: migrationError } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    console.log('Migration jobs found:', migrationData?.length || 0);
    if (migrationData) {
      migrationData.forEach(job => {
        console.log(`- Job ${job.id}: ${job.job_type}, status: ${job.status}, created: ${job.created_at}`);
        if (job.results) {
          console.log(`  Results:`, job.results);
        }
      });
    }
  } catch (e) {
    console.log('No migration_jobs table found');
  }
}

checkGoTeamUpData().catch(console.error);