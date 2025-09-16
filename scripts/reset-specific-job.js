const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSpecificJob() {
  const jobId = '746d1130-66aa-4bfe-b930-fef3fd35803f'; // The job with 227 records

  console.log(`🔧 Resetting job ${jobId}...\n`);

  try {
    // 1. Get current job state
    console.log('1. Checking current job state...');
    const { data: job, error: fetchError } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return;
    }

    console.log(`Current status: ${job.status}`);
    console.log(`Total records: ${job.total_records}`);
    console.log(`Processed: ${job.processed_records}`);

    // 2. Reset to pending
    console.log('\n2. Resetting job to pending...');
    const { error: resetError } = await supabase
      .from('migration_jobs')
      .update({
        status: 'pending',
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (resetError) {
      console.error('Error resetting job:', resetError);
      return;
    }

    console.log('✅ Job reset to pending');

    // 3. Check if migration records exist
    console.log('\n3. Checking migration records...');
    const { data: records, count } = await supabase
      .from('migration_records')
      .select('id, source_data', { count: 'exact' })
      .eq('migration_job_id', jobId)
      .limit(5);

    console.log(`Found ${count || 0} migration records`);

    if (records && records.length > 0) {
      console.log('\nSample records:');
      records.forEach((record, idx) => {
        const name = record.source_data?.Name || record.source_data?.name || 'Unknown';
        console.log(`  ${idx + 1}. ${name}`);
      });
    }

    // 4. Process the records directly
    if (count && count > 0) {
      console.log('\n4. Starting direct processing...');

      // Process in small batches
      const batchSize = 10;
      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Get all records
      const { data: allRecords } = await supabase
        .from('migration_records')
        .select('*')
        .eq('migration_job_id', jobId);

      if (allRecords) {
        // Update job to processing
        await supabase
          .from('migration_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        console.log(`Processing ${allRecords.length} records...`);

        for (let i = 0; i < allRecords.length; i += batchSize) {
          const batch = allRecords.slice(i, i + batchSize);

          for (const record of batch) {
            try {
              const sourceData = record.source_data;

              // Parse name
              const fullName = sourceData.Name || sourceData.name || 'Unknown';
              const nameParts = fullName.split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ') || '';

              const clientData = {
                organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
                org_id: '63589490-8f55-4157-bd3a-e141594b748e',
                name: fullName,
                first_name: firstName,
                last_name: lastName,
                email: sourceData.Email || sourceData.email || null,
                phone: sourceData.Phone || sourceData.phone || null,
                source: 'migration',
                client_type: 'gym_member',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              // Check if client exists
              if (clientData.email) {
                const { data: existing } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('organization_id', clientData.organization_id)
                  .eq('email', clientData.email)
                  .single();

                if (!existing) {
                  // Insert new client
                  const { error: insertError } = await supabase
                    .from('clients')
                    .insert(clientData);

                  if (insertError) throw insertError;
                }
              } else {
                // Insert without email check
                const { error: insertError } = await supabase
                  .from('clients')
                  .insert(clientData);

                if (insertError) throw insertError;
              }

              successful++;
            } catch (err) {
              console.error(`Failed to process: ${err.message}`);
              failed++;
            }
            processed++;
          }

          // Update progress
          await supabase
            .from('migration_jobs')
            .update({
              processed_records: processed,
              successful_records: successful,
              failed_records: failed,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);

          console.log(`Progress: ${processed}/${allRecords.length} (${Math.round(processed/allRecords.length*100)}%)`);
        }

        // Mark as completed
        await supabase
          .from('migration_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        console.log('\n✅ Processing complete!');
        console.log(`Successful: ${successful}`);
        console.log(`Failed: ${failed}`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

resetSpecificJob();