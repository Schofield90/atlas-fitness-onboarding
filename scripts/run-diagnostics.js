const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  console.log('🔍 Running Performance Diagnostics...\n');

  try {
    // 1. Check for stuck jobs
    console.log('1. Checking for stuck migration jobs...');
    const { data: stuckJobs, error: stuckError } = await supabase
      .from('migration_jobs')
      .select('id, status, total_records, processed_records, started_at, updated_at')
      .in('status', ['processing', 'analyzing', 'mapping'])
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    if (stuckError) {
      console.error('Error checking stuck jobs:', stuckError);
    } else {
      console.log(`Found ${stuckJobs?.length || 0} stuck jobs:`);
      stuckJobs?.forEach(job => {
        const duration = job.started_at ?
          Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000 / 60) : 0;
        console.log(`  - Job ${job.id}: ${job.status}, running for ${duration} minutes`);
      });
    }

    // 2. Count migration records
    console.log('\n2. Counting migration records...');
    const { count: recordCount, error: countError } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    if (countError) {
      console.error('Error counting records:', countError);
    } else {
      console.log(`Total migration records: ${recordCount}`);
    }

    // 3. Check recent migration logs
    console.log('\n3. Checking recent migration activity...');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logsError } = await supabase
      .from('migration_logs')
      .select('id')
      .gte('created_at', tenMinutesAgo);

    if (logsError) {
      console.error('Error checking logs:', logsError);
    } else {
      console.log(`Migration logs in last 10 minutes: ${recentLogs?.length || 0}`);
    }

    // 4. Reset the stuck job to pending
    console.log('\n4. Resetting stuck job to pending status...');
    const { error: resetError } = await supabase
      .from('migration_jobs')
      .update({
        status: 'pending',
        started_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'd663c635-4378-43c7-bde9-e5587e13a816');

    if (resetError) {
      console.error('Error resetting job:', resetError);
    } else {
      console.log('✅ Job reset to pending status successfully');
    }

    // 5. Clear old migration logs
    console.log('\n5. Clearing old migration logs...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('migration_logs')
      .delete()
      .eq('migration_job_id', 'd663c635-4378-43c7-bde9-e5587e13a816')
      .lt('created_at', oneHourAgo);

    if (deleteError) {
      console.error('Error clearing logs:', deleteError);
    } else {
      console.log('✅ Old logs cleared successfully');
    }

    console.log('\n✨ Diagnostics complete!');
    console.log('The stuck job has been reset to pending status.');
    console.log('You can now test the migration processing locally.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

runDiagnostics();