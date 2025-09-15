const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProductionPerformance() {
  console.log('🚨 FIXING PRODUCTION PERFORMANCE ISSUES\n');
  console.log('This will clean up ALL problematic migration data\n');

  try {
    // 1. Get ALL migration jobs that could be causing issues
    console.log('1. Finding all problematic migration jobs...');
    const { data: allJobs, error: jobsError } = await supabase
      .from('migration_jobs')
      .select('id, status, organization_id, created_at')
      .in('status', ['processing', 'analyzing', 'mapping', 'uploading', 'pending'])
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return;
    }

    console.log(`Found ${allJobs?.length || 0} active/pending jobs`);

    if (allJobs && allJobs.length > 0) {
      // Group by organization
      const byOrg = {};
      allJobs.forEach(job => {
        if (!byOrg[job.organization_id]) {
          byOrg[job.organization_id] = [];
        }
        byOrg[job.organization_id].push(job);
      });

      console.log(`Jobs across ${Object.keys(byOrg).length} organizations:`);
      Object.entries(byOrg).forEach(([orgId, jobs]) => {
        console.log(`  - ${orgId}: ${jobs.length} jobs`);
      });

      // 2. Mark ALL these jobs as failed
      console.log('\n2. Marking all active jobs as failed...');
      const jobIds = allJobs.map(job => job.id);

      const { error: updateError } = await supabase
        .from('migration_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', jobIds);

      if (updateError) {
        console.error('Error updating jobs:', updateError);
      } else {
        console.log(`✅ Marked ${jobIds.length} jobs as failed`);
      }

      // 3. Delete associated migration records to free up space
      console.log('\n3. Cleaning up migration records...');
      const { error: deleteRecordsError } = await supabase
        .from('migration_records')
        .delete()
        .in('migration_job_id', jobIds);

      if (deleteRecordsError) {
        console.error('Error deleting records:', deleteRecordsError);
      } else {
        console.log('✅ Cleaned up migration records');
      }

      // 4. Delete migration logs
      console.log('\n4. Cleaning up migration logs...');
      const { error: deleteLogsError } = await supabase
        .from('migration_logs')
        .delete()
        .in('migration_job_id', jobIds);

      if (deleteLogsError) {
        console.error('Error deleting logs:', deleteLogsError);
      } else {
        console.log('✅ Cleaned up migration logs');
      }

      // 5. Clean up files
      console.log('\n5. Cleaning up migration files...');
      const { data: files, error: filesError } = await supabase
        .from('migration_files')
        .select('storage_path')
        .in('migration_job_id', jobIds);

      if (!filesError && files && files.length > 0) {
        const paths = files.map(f => f.storage_path);
        const { error: storageError } = await supabase.storage
          .from('migrations')
          .remove(paths);

        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
        } else {
          console.log(`✅ Deleted ${files.length} files from storage`);
        }
      }
    }

    // 6. Check if there are any orphaned records
    console.log('\n6. Checking for orphaned migration records...');
    const { count: orphanedCount } = await supabase
      .from('migration_records')
      .select('*', { count: 'exact', head: true });

    console.log(`Total remaining migration records: ${orphanedCount || 0}`);

    if (orphanedCount && orphanedCount > 100) {
      console.log('⚠️  Still have many migration records. Consider full cleanup if issues persist.');
    }

    console.log('\n✨ PRODUCTION CLEANUP COMPLETE!');
    console.log('The site should be responsive again.');
    console.log('\nNext steps:');
    console.log('1. Clear your browser cache');
    console.log('2. Try accessing the site in an incognito window');
    console.log('3. If still slow, wait 1-2 minutes for caches to clear');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Add confirmation
console.log('⚠️  WARNING: This will clean up ALL active migration jobs');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  fixProductionPerformance();
}, 3000);