const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMigrationProcessing() {
  console.log('🧪 Testing Migration Processing...\n');

  try {
    // 1. First sign in as a test user to get a session
    console.log('1. Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: 'Admin123!'
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('✅ Signed in successfully');
    const accessToken = authData.session?.access_token;

    // 2. Test the start-processing endpoint
    console.log('\n2. Testing start-processing endpoint...');
    const jobId = 'd663c635-4378-43c7-bde9-e5587e13a816';

    const response = await fetch(`http://localhost:3000/api/migration/jobs/${jobId}/start-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Processing started successfully!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Processing failed:', result);
    }

    // 3. Check the job status
    console.log('\n3. Checking job status...');
    const { data: job, error: jobError } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('Error fetching job:', jobError);
    } else {
      console.log('Job status:', job.status);
      console.log('Processed records:', job.processed_records, '/', job.total_records);
    }

    // 4. Check if any clients were created
    console.log('\n4. Checking created clients...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false })
      .limit(5);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else {
      console.log(`Found ${clients?.length || 0} recent clients:`);
      clients?.forEach(client => {
        console.log(`  - ${client.name} (${client.email || 'no email'})`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testMigrationProcessing();