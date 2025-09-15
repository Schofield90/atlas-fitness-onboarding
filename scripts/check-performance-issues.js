const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPerformance() {
  console.log('🔍 Checking for performance issues...\n');

  try {
    // 1. Check for any migration jobs in processing states
    console.log('1. Checking migration jobs status...');
    const { data: activeJobs, error: jobsError } = await supabase
      .from('migration_jobs')
      .select('id, status, total_records, processed_records, started_at, updated_at')
      .in('status', ['processing', 'analyzing', 'mapping', 'uploading'])
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    if (jobsError) {
      console.error('Error checking jobs:', jobsError);
    } else {
      console.log(`Found ${activeJobs?.length || 0} active migration jobs:`);
      activeJobs?.forEach(job => {
        const duration = job.started_at ?
          Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000 / 60) : 0;
        console.log(`  - Job ${job.id}: ${job.status}, ${job.processed_records}/${job.total_records} records, running for ${duration} minutes`);
      });
    }

    // 2. Check migration records count
    console.log('\n2. Checking migration records...');
    const { count: recordCount } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    console.log(`Total migration records: ${recordCount || 0}`);

    // 3. Check recent migration activity
    console.log('\n3. Checking recent activity...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logsError } = await supabase
      .from('migration_logs')
      .select('id, level, message, created_at')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('Error checking logs:', logsError);
    } else {
      console.log(`Recent log entries (last 5 minutes): ${recentLogs?.length || 0}`);
      if (recentLogs && recentLogs.length > 0) {
        console.log('Latest logs:');
        recentLogs.slice(0, 3).forEach(log => {
          console.log(`  - [${log.level}] ${log.message.substring(0, 100)}...`);
        });
      }
    }

    // 4. Check for any failed jobs that might be retrying
    console.log('\n4. Checking failed jobs...');
    const { data: failedJobs, error: failedError } = await supabase
      .from('migration_jobs')
      .select('id, status, error_message, updated_at')
      .eq('status', 'failed')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (failedError) {
      console.error('Error checking failed jobs:', failedError);
    } else {
      console.log(`Failed jobs: ${failedJobs?.length || 0}`);
      failedJobs?.forEach(job => {
        console.log(`  - Job ${job.id}: ${job.error_message?.substring(0, 50) || 'No error message'}`);
      });
    }

    // 5. Check clients table for recent activity
    console.log('\n5. Checking recent client imports...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .gte('created_at', oneHourAgo);

    console.log(`Clients created in last hour: ${recentClientsCount || 0}`);

    // 6. Provide recommendations
    console.log('\n📊 Summary:');
    if (activeJobs && activeJobs.length > 0) {
      console.log('⚠️  There are active migration jobs that might be causing performance issues.');
      console.log('   Consider pausing or cancelling them if they are stuck.');
    } else {
      console.log('✅ No active migration jobs found.');
    }

    if (recordCount && recordCount > 1000) {
      console.log('⚠️  Large number of migration records. Consider cleaning up old records.');
    }

    console.log('\n✨ Check complete!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPerformance();