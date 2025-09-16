const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadAndParseCSV() {
  const jobId = '746d1130-66aa-4bfe-b930-fef3fd35803f';
  const storagePath = '746d1130-66aa-4bfe-b930-fef3fd35803f/teamup-customer-list-atlas-fitness-2025-09-15.csv';

  console.log('📥 Downloading and parsing CSV file...\n');

  try {
    // Download the file
    console.log('1. Downloading file from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('migrations')
      .download(storagePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return;
    }

    const csvText = await fileData.text();
    console.log(`Downloaded ${csvText.length} bytes`);

    // Parse the CSV
    console.log('\n2. Parsing CSV...');
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    console.log(`Parsed ${parseResult.data.length} rows`);
    console.log(`Parse errors: ${parseResult.errors.length}`);

    // Show headers
    if (parseResult.data.length > 0) {
      const headers = Object.keys(parseResult.data[0]);
      console.log('\n3. CSV Headers:');
      headers.forEach((header, idx) => {
        console.log(`  ${idx + 1}. "${header}"`);
      });

      // Show first 3 rows
      console.log('\n4. Sample data (first 3 rows):');
      parseResult.data.slice(0, 3).forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`);
        Object.entries(row).slice(0, 10).forEach(([key, value]) => {
          if (value && value !== '') {
            console.log(`  ${key}: ${value}`);
          }
        });
      });

      // Check for membership columns
      console.log('\n5. Membership-related columns:');
      const membershipColumns = headers.filter(h =>
        h.toLowerCase().includes('member') ||
        h.toLowerCase().includes('plan') ||
        h.toLowerCase().includes('subscription') ||
        h.toLowerCase().includes('package')
      );

      if (membershipColumns.length > 0) {
        console.log('Found membership columns:');
        membershipColumns.forEach(col => {
          console.log(`  - ${col}`);
          // Show sample values
          const sampleValues = parseResult.data
            .slice(0, 5)
            .map(row => row[col])
            .filter(v => v && v !== '');
          if (sampleValues.length > 0) {
            console.log(`    Sample values: ${sampleValues.slice(0, 3).join(', ')}`);
          }
        });
      } else {
        console.log('No obvious membership columns found');
      }

      // Now save all records properly
      console.log('\n6. Saving all records to database...');

      // Delete existing records first
      const { error: deleteError } = await supabase
        .from('migration_records')
        .delete()
        .eq('migration_job_id', jobId);

      if (deleteError) {
        console.error('Error deleting old records:', deleteError);
      }

      // Create all records
      const records = [];
      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i];
        records.push({
          migration_job_id: jobId,
          organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
          source_row_number: i + 2, // +2 because row 1 is headers
          source_data: row,
          status: 'pending',
          record_type: 'client',
        });
      }

      // Insert in batches of 50
      const batchSize = 50;
      let totalInserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error: insertError, data: insertedData } = await supabase
          .from('migration_records')
          .insert(batch)
          .select();

        if (insertError) {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, insertError);
        } else {
          totalInserted += insertedData?.length || 0;
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: Inserted ${insertedData?.length || 0} records`);
        }
      }

      console.log(`\n✅ Total records inserted: ${totalInserted}`);

      // Update job with correct total
      await supabase
        .from('migration_jobs')
        .update({
          total_records: totalInserted,
          status: 'pending',
          processed_records: 0,
          successful_records: 0,
          failed_records: 0
        })
        .eq('id', jobId);

      console.log('Job updated with correct totals');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

downloadAndParseCSV();