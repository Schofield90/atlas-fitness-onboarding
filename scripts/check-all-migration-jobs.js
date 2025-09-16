const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllJobs() {
  console.log('📊 Checking all migration jobs...\n');

  try {
    // Get ALL recent migration jobs
    const { data: allJobs, error } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    console.log(`Found ${allJobs?.length || 0} recent jobs:\n`);

    allJobs?.forEach(job => {
      const createdAt = new Date(job.created_at);
      const now = new Date();
      const ageMinutes = Math.round((now - createdAt) / 1000 / 60);

      console.log(`Job: ${job.id}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Total Records: ${job.total_records || 0}`);
      console.log(`  Processed: ${job.processed_records || 0}`);
      console.log(`  Created: ${ageMinutes} minutes ago`);
      console.log(`  Started: ${job.started_at || 'Not started'}`);
      console.log('---');
    });

    // Find the most recent processing job
    const processingJob = allJobs?.find(j => j.status === 'processing');

    if (processingJob) {
      console.log('\n⚠️  FOUND STUCK PROCESSING JOB!');
      console.log(`Job ID: ${processingJob.id}`);

      // Reset it
      console.log('\nResetting this job to pending...');
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
        .eq('id', processingJob.id);

      if (resetError) {
        console.error('Error resetting job:', resetError);
      } else {
        console.log('✅ Job reset successfully!');
        console.log('You can now use "Start Processing" button');
      }
    }

    // Check for any jobs with 227 records (from the screenshot)
    const targetJob = allJobs?.find(j => j.total_records === 227);
    if (targetJob && targetJob.status !== 'processing') {
      console.log(`\n📍 Found job with 227 records: ${targetJob.id}`);
      console.log(`   Current status: ${targetJob.status}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAllJobs();