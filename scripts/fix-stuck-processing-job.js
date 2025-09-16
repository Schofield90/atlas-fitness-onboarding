const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStuckProcessingJob() {
  console.log('🔧 Fixing stuck processing job...\n');

  try {
    // 1. Find the stuck processing job
    console.log('1. Finding stuck processing jobs...');
    const { data: stuckJobs, error: findError } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('status', 'processing')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false });

    if (findError) {
      console.error('Error finding jobs:', findError);
      return;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('No stuck processing jobs found');
      return;
    }

    const job = stuckJobs[0];
    console.log(`Found stuck job: ${job.id}`);
    console.log(`  - Status: ${job.status}`);
    console.log(`  - Total records: ${job.total_records}`);
    console.log(`  - Processed: ${job.processed_records}`);
    console.log(`  - Started: ${job.started_at}`);

    // 2. Reset the job to 'pending' to allow restart
    console.log('\n2. Resetting job to pending status...');
    const { error: resetError } = await supabase
      .from('migration_jobs')
      .update({
        status: 'pending',
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        started_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (resetError) {
      console.error('Error resetting job:', resetError);
      return;
    }

    console.log('✅ Job reset to pending status');

    // 3. Check if migration_records exist
    console.log('\n3. Checking migration records...');
    const { data: records, count } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact', head: true })
      .eq('migration_job_id', job.id);

    console.log(`Found ${count || 0} migration records for this job`);

    if (count && count > 0) {
      console.log('✅ Records are ready for processing');
      console.log('\n📝 Next steps:');
      console.log('1. Click the "Start Processing" button in the UI');
      console.log('2. Or the processing should start automatically');
    } else {
      console.log('⚠️  No migration records found');
      console.log('The job may need to be re-parsed first');
    }

    // 4. Clear any error logs
    console.log('\n4. Clearing error logs...');
    const { error: clearLogsError } = await supabase
      .from('migration_logs')
      .delete()
      .eq('migration_job_id', job.id);

    if (!clearLogsError) {
      console.log('✅ Cleared old logs');
    }

    console.log('\n✨ Job has been reset and is ready to process!');
    console.log('You can now click "Start Processing" in the UI');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixStuckProcessingJob();