const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'
);

async function checkMigrationResults() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('=== CHECKING MIGRATION RESULTS ===');
  
  // Get successful migration jobs with results
  const { data: successfulJobs, error: jobsError } = await supabase
    .from('migration_jobs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'completed')
    .not('results', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('Successful jobs with results:', successfulJobs?.length || 0);
  
  if (successfulJobs) {
    successfulJobs.forEach(job => {
      console.log(`\n--- Job ${job.id} ---`);
      console.log('Job type:', job.job_type);
      console.log('Created:', job.created_at);
      console.log('Results:', JSON.stringify(job.results, null, 2));
    });
  }
  
  // Check for clients that might have been imported
  console.log('\n=== CHECKING CLIENTS ===');
  const { data: allClients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('Total clients found:', allClients?.length || 0);
  if (allClients && allClients.length > 0) {
    console.log('\nSample clients:');
    allClients.slice(0, 5).forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name} (${client.email})`);
      console.log(`  Created: ${client.created_at}, External ID: ${client.external_id || 'none'}`);
      console.log(`  Last visit: ${client.last_visit_date || 'none'}`);
    });
  }
  
  // Check for any attendance-related data in clients
  console.log('\n=== CHECKING CLIENT ATTENDANCE HISTORY ===');
  const { data: clientsWithHistory, error: historyError } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .not('last_visit_date', 'is', null)
    .order('last_visit_date', { ascending: false });
  
  console.log('Clients with visit history:', clientsWithHistory?.length || 0);
  if (clientsWithHistory) {
    clientsWithHistory.forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name}: last visit ${client.last_visit_date}`);
    });
  }
  
  // Check if there's an attendance_history or similar table
  console.log('\n=== CHECKING POSSIBLE ATTENDANCE TABLES ===');
  const attendanceTables = [
    'attendance_history',
    'client_attendance',
    'goteamup_attendance', 
    'imported_attendance',
    'visit_history',
    'class_participation'
  ];
  
  for (const tableName of attendanceTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count(*)')
        .eq('organization_id', organizationId);
      
      if (!error) {
        console.log(`✓ Table ${tableName} exists with ${data[0]?.count || 0} records`);
        
        // Get sample data
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .eq('organization_id', organizationId)
          .limit(3);
        
        if (sampleData && sampleData.length > 0) {
          console.log(`  Sample data:`, sampleData);
        }
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
}

checkMigrationResults().catch(console.error);