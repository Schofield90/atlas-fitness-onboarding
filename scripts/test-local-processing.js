const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLocalProcessing() {
  console.log('🧪 Testing Local Migration Processing...\n');

  const jobId = 'd663c635-4378-43c7-bde9-e5587e13a816';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  try {
    // 1. Get migration records
    console.log('1. Fetching migration records...');
    const { data: records, error: recordsError } = await supabase
      .from('migration_records')
      .select('*')
      .eq('migration_job_id', jobId)
      .limit(5); // Process just 5 records for testing

    if (recordsError) {
      console.error('Error fetching records:', recordsError);
      return;
    }

    console.log(`Found ${records?.length || 0} records to process\n`);

    // 2. Process each record
    let successCount = 0;
    let failCount = 0;

    for (const record of records || []) {
      try {
        const sourceData = record.source_data;
        console.log(`Processing: ${sourceData.Name || sourceData.name || 'Unknown'}`);

        // Extract client data
        // Parse name into first and last
        const fullName =
          sourceData.Name ||
          sourceData.name ||
          `${sourceData["First Name"] || ""} ${sourceData["Last Name"] || ""}`.trim() ||
          "Unknown Client";

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const clientData = {
          organization_id: organizationId,
          org_id: organizationId, // Both fields for compatibility
          name: fullName,
          first_name: sourceData["First Name"] || sourceData.FirstName || firstName,
          last_name: sourceData["Last Name"] || sourceData.LastName || lastName,
          email: sourceData.Email || sourceData.email || null,
          phone:
            sourceData.Phone || sourceData.phone || sourceData.Mobile || null,
          date_of_birth: sourceData.DOB || sourceData["Date of Birth"] || null,
          emergency_contact_name: sourceData["Emergency Contact"] || null,
          emergency_contact_phone: sourceData["Emergency Phone"] || null,
          medical_notes: sourceData["Medical Conditions"] || null,
          notes: sourceData.Notes || sourceData.notes || null,
          source: "migration",
          client_type: "gym_member",
          status: sourceData.Status === "Inactive" ? "inactive" : "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Check if client exists
        if (clientData.email) {
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("email", clientData.email)
            .single();

          if (existingClient) {
            console.log(`  ↺ Updating existing client: ${clientData.name}`);

            const { error: updateError } = await supabase
              .from("clients")
              .update({
                ...clientData,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingClient.id);

            if (updateError) throw updateError;

            // Create migration link
            await supabase.from("migration_links").upsert({
              migration_record_id: record.id,
              target_table: "clients",
              target_id: existingClient.id,
            });

            successCount++;
          } else {
            console.log(`  + Creating new client: ${clientData.name}`);

            const { data: newClient, error: insertError } = await supabase
              .from("clients")
              .insert(clientData)
              .select()
              .single();

            if (insertError) throw insertError;

            // Create migration link
            await supabase.from("migration_links").upsert({
              migration_record_id: record.id,
              target_table: "clients",
              target_id: newClient.id,
            });

            successCount++;
          }
        } else {
          console.log(`  + Creating new client (no email): ${clientData.name}`);

          const { data: newClient, error: insertError } = await supabase
            .from("clients")
            .insert(clientData)
            .select()
            .single();

          if (insertError) throw insertError;

          // Create migration link
          await supabase.from("migration_links").upsert({
            migration_record_id: record.id,
            target_table: "clients",
            target_id: newClient.id,
          });

          successCount++;
        }

      } catch (error) {
        console.error(`  ✗ Failed:`, error.message);
        failCount++;
      }
    }

    // 3. Update job status
    console.log(`\n3. Updating job status...`);
    const { error: updateJobError } = await supabase
      .from('migration_jobs')
      .update({
        status: 'processing',
        processed_records: successCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateJobError) {
      console.error('Error updating job:', updateJobError);
    }

    // 4. Summary
    console.log('\n📊 Processing Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);

    // 5. Check created clients
    console.log('\n5. Verifying created clients...');
    const { data: clients, count } = await supabase
      .from('clients')
      .select('id, name, email', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Total clients in organization: ${count}`);
    console.log('Recent clients:');
    clients?.forEach(client => {
      console.log(`  - ${client.name} (${client.email || 'no email'})`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testLocalProcessing();