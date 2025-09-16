const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationRecords() {
  const jobId = '746d1130-66aa-4bfe-b930-fef3fd35803f';

  console.log('📊 Checking migration records in detail...\n');

  try {
    // 1. Check all migration records
    console.log('1. Checking ALL migration records for organization...');
    const { data: allRecords, count: totalCount } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact' })
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    console.log(`Total migration records in organization: ${totalCount || 0}`);

    // 2. Group by job
    const recordsByJob = {};
    allRecords?.forEach(record => {
      if (!recordsByJob[record.migration_job_id]) {
        recordsByJob[record.migration_job_id] = [];
      }
      recordsByJob[record.migration_job_id].push(record);
    });

    console.log('\nRecords by job:');
    Object.entries(recordsByJob).forEach(([jobId, records]) => {
      console.log(`  Job ${jobId}: ${records.length} records`);
    });

    // 3. Check specific job
    console.log(`\n2. Checking specific job ${jobId}...`);
    const { data: jobRecords, count } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact' })
      .eq('migration_job_id', jobId);

    console.log(`Records for this job: ${count || 0}`);

    if (jobRecords && jobRecords.length > 0) {
      console.log('\nSample records:');
      jobRecords.slice(0, 5).forEach((record, idx) => {
        const data = record.source_data;
        console.log(`  ${idx + 1}. Row ${record.source_row_number}:`);
        console.log(`     Name: ${data?.Name || data?.name || 'Unknown'}`);
        console.log(`     Email: ${data?.Email || data?.email || 'None'}`);
        console.log(`     Membership: ${data?.Membership || data?.membership_type || data?.['Membership Type'] || 'None'}`);
      });
    }

    // 4. Check if there's a different job with 227 records
    console.log('\n3. Looking for job with full 227 records...');
    const { data: jobs } = await supabase
      .from('migration_jobs')
      .select('id, total_records, status, created_at')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .eq('total_records', 227);

    if (jobs && jobs.length > 0) {
      console.log(`Found ${jobs.length} job(s) with 227 total_records:`);
      jobs.forEach(job => {
        console.log(`  Job ${job.id}: status=${job.status}, created=${job.created_at}`);
      });

      // Check actual records for each
      for (const job of jobs) {
        const { count } = await supabase
          .from('migration_records')
          .select('*', { count: 'exact', head: true })
          .eq('migration_job_id', job.id);

        console.log(`    -> Actual records in database: ${count || 0}`);
      }
    }

    // 5. Check file metadata
    console.log('\n4. Checking file metadata...');
    const { data: file } = await supabase
      .from('migration_files')
      .select('*')
      .eq('migration_job_id', jobId)
      .single();

    if (file) {
      console.log(`File: ${file.file_name}`);
      console.log(`Size: ${file.file_size} bytes`);
      console.log(`Storage path: ${file.storage_path}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkMigrationRecords();