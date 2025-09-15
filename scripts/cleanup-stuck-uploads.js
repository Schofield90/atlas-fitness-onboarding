const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupStuckUploads() {
  console.log('🧹 Cleaning up stuck upload jobs...\n');

  try {
    // Get all stuck uploading jobs
    const { data: stuckJobs, error: fetchError } = await supabase
      .from('migration_jobs')
      .select('id, status')
      .eq('status', 'uploading')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    if (fetchError) {
      console.error('Error fetching stuck jobs:', fetchError);
      return;
    }

    console.log(`Found ${stuckJobs?.length || 0} stuck uploading jobs`);

    if (stuckJobs && stuckJobs.length > 0) {
      // Mark all stuck uploading jobs as failed
      const jobIds = stuckJobs.map(job => job.id);

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
        console.log('Failed job IDs:');
        jobIds.forEach(id => console.log(`  - ${id}`));
      }

      // Clean up any orphaned files
      console.log('\nCleaning up orphaned files...');
      const { data: files, error: filesError } = await supabase
        .from('migration_files')
        .select('id, storage_path')
        .in('migration_job_id', jobIds);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      } else if (files && files.length > 0) {
        console.log(`Found ${files.length} orphaned files`);

        // Delete files from storage
        for (const file of files) {
          const { error: deleteError } = await supabase.storage
            .from('migrations')
            .remove([file.storage_path]);

          if (deleteError) {
            console.error(`Failed to delete file ${file.storage_path}:`, deleteError.message);
          } else {
            console.log(`  ✓ Deleted ${file.storage_path}`);
          }
        }
      }
    }

    console.log('\n✨ Cleanup complete!');
    console.log('The site should be responsive again.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupStuckUploads();