const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processAllRecords() {
  const jobId = '746d1130-66aa-4bfe-b930-fef3fd35803f';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  console.log('🚀 Processing all migration records with correct field mappings...\n');

  try {
    // 1. Reset job
    console.log('1. Resetting job to pending...');
    await supabase
      .from('migration_jobs')
      .update({
        status: 'pending',
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
        started_at: null,
        completed_at: null
      })
      .eq('id', jobId);

    // 2. Get all migration records
    console.log('2. Fetching all migration records...');
    const { data: records, error: fetchError } = await supabase
      .from('migration_records')
      .select('*')
      .eq('migration_job_id', jobId);

    if (fetchError) {
      console.error('Error fetching records:', fetchError);
      return;
    }

    console.log(`Found ${records?.length || 0} records to process`);

    // 3. Update job to processing
    await supabase
      .from('migration_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        total_records: records?.length || 0
      })
      .eq('id', jobId);

    // 4. Process records
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < (records?.length || 0); i += batchSize) {
      const batch = records?.slice(i, i + batchSize) || [];

      for (const record of batch) {
        try {
          const sourceData = record.source_data;

          // Extract data using correct field names from GoTeamUp
          const fullName = sourceData["Full Name"] || "Unknown Client";
          const firstName = sourceData["First Name"] || fullName.split(" ")[0] || "";
          const lastName = sourceData["Last Name"] || fullName.split(" ").slice(1).join(" ") || "";

          // Extract membership information
          const activeMembership = sourceData["Active Memberships"] || "";
          const onHoldMembership = sourceData["On Hold Memberships"] || "";
          const inactiveMembership = sourceData["Inactive Memberships"] || "";

          // Combine membership info
          const membershipInfo = [];
          if (activeMembership) membershipInfo.push(`Active: ${activeMembership}`);
          if (onHoldMembership) membershipInfo.push(`On Hold: ${onHoldMembership}`);
          if (inactiveMembership) membershipInfo.push(`Inactive: ${inactiveMembership}`);

          const membershipNotes = membershipInfo.length > 0
            ? `Memberships: ${membershipInfo.join(", ")}`
            : "";

          // Extract address
          const addressInfo = {
            address_line_1: sourceData["Address Line 1"] || "",
            address_line_2: sourceData["Address Line 2"] || "",
            city: sourceData["City"] || "",
            region: sourceData["Region"] || "",
            postcode: sourceData["Postcode"] || "",
            country: sourceData["Country"] || "",
          };

          const clientData = {
            organization_id: organizationId,
            org_id: organizationId,
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            email: sourceData["Email"] || null,
            phone: sourceData["Phone"] || null,
            date_of_birth: sourceData["DOB"] || null,
            gender: sourceData["Gender"] || null,
            emergency_contact_name: sourceData["Emergency Contact Name"] || null,
            emergency_contact_phone: sourceData["Emergency Contact Phone"] || null,
            notes: membershipNotes,
            source: "migration",
            client_type: "gym_member",
            status: sourceData["Status"] === "inactive" ? "inactive" : "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              address: addressInfo,
              join_date: sourceData["Join Date"] || null,
              active_membership: activeMembership || null,
              on_hold_membership: onHoldMembership || null,
              inactive_membership: inactiveMembership || null,
              registrations: sourceData["# Registrations"] || null,
              attendances: sourceData["# Attendances"] || null,
              last_payment_amount: sourceData["Last Payment Amount (GBP)"] || null,
              last_payment_date: sourceData["Last Payment Date"] || null,
            }
          };

          // Check if client exists
          if (clientData.email) {
            const { data: existing } = await supabase
              .from('clients')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('email', clientData.email)
              .single();

            if (existing) {
              // Update existing
              const { error: updateError } = await supabase
                .from('clients')
                .update({
                  ...clientData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

              if (updateError) throw updateError;
              console.log(`✓ Updated: ${fullName} (${clientData.email})`);
            } else {
              // Insert new
              const { error: insertError } = await supabase
                .from('clients')
                .insert(clientData);

              if (insertError) throw insertError;
              console.log(`+ Created: ${fullName} (${clientData.email}) - ${activeMembership || 'No membership'}`);
            }
          } else {
            // No email, insert anyway
            const { error: insertError } = await supabase
              .from('clients')
              .insert(clientData);

            if (insertError) throw insertError;
            console.log(`+ Created: ${fullName} (no email) - ${activeMembership || 'No membership'}`);
          }

          successful++;
        } catch (err) {
          console.error(`✗ Failed ${record.source_data?.["Full Name"] || 'Unknown'}: ${err.message}`);
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

      console.log(`\nProgress: ${processed}/${records?.length} (${Math.round(processed/(records?.length || 1)*100)}%)`);
    }

    // 5. Mark as completed
    await supabase
      .from('migration_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('\n✅ Processing complete!');
    console.log(`Total: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    // 6. Show sample imported clients
    console.log('\n📊 Sample imported clients with memberships:');
    const { data: sampleClients } = await supabase
      .from('clients')
      .select('name, email, notes, metadata')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .limit(5);

    sampleClients?.forEach(client => {
      console.log(`\n${client.name} (${client.email || 'no email'})`);
      if (client.notes) console.log(`  Notes: ${client.notes}`);
      if (client.metadata?.active_membership) {
        console.log(`  Active Membership: ${client.metadata.active_membership}`);
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

processAllRecords();