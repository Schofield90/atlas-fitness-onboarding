const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to normalize gender values to match database constraints
function normalizeGender(gender) {
  if (!gender) return null;

  const genderLower = gender.toLowerCase().trim();

  // Map common variations to allowed values
  if (genderLower === 'male' || genderLower === 'm') return 'male';
  if (genderLower === 'female' || genderLower === 'f') return 'female';
  if (genderLower === 'other') return 'other';
  if (genderLower === 'prefer_not_to_say') return 'prefer_not_to_say';

  // Default to null if not recognized
  return null;
}

async function processWithFixedGender() {
  const jobId = '746d1130-66aa-4bfe-b930-fef3fd35803f';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  console.log('🚀 Processing with fixed gender mapping...\n');

  try {
    // Reset job
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

    // Get all migration records
    const { data: records } = await supabase
      .from('migration_records')
      .select('*')
      .eq('migration_job_id', jobId);

    console.log(`Processing ${records?.length || 0} records...\n`);

    // Update job to processing
    await supabase
      .from('migration_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        total_records: records?.length || 0
      })
      .eq('id', jobId);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors = {};

    for (const record of records || []) {
      try {
        const sourceData = record.source_data;

        // Extract data
        const fullName = sourceData["Full Name"] || "Unknown Client";
        const firstName = sourceData["First Name"] || fullName.split(" ")[0] || "";
        const lastName = sourceData["Last Name"] || fullName.split(" ").slice(1).join(" ") || "";

        // Extract and normalize gender
        const rawGender = sourceData["Gender"];
        const normalizedGender = normalizeGender(rawGender);

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
          ? membershipInfo.join(", ")
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
          gender: normalizedGender, // Use normalized gender
          emergency_contact_name: sourceData["Emergency Contact Name"] || null,
          emergency_contact_phone: sourceData["Emergency Contact Phone"] || null,
          notes: membershipNotes,
          source: "migration",
          client_type: "gym_member",
          status: sourceData["Status"] === "inactive" ? "inactive" : "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            original_gender: rawGender, // Store original value
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
            successful++;
            console.log(`✓ Updated: ${fullName}`);
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('clients')
              .insert(clientData);

            if (insertError) throw insertError;
            successful++;

            // Log successful imports with memberships
            if (activeMembership) {
              console.log(`✅ ${fullName} - ${activeMembership}`);
            } else {
              console.log(`✓ ${fullName}`);
            }
          }
        } else {
          // No email, insert anyway
          const { error: insertError } = await supabase
            .from('clients')
            .insert(clientData);

          if (insertError) throw insertError;
          successful++;
          console.log(`✓ ${fullName} (no email)`);
        }

      } catch (err) {
        failed++;
        const errorKey = err.message.substring(0, 50);
        errors[errorKey] = (errors[errorKey] || 0) + 1;
      }
      processed++;

      // Update progress every 20 records
      if (processed % 20 === 0) {
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
        console.log(`Success: ${successful}, Failed: ${failed}\n`);
      }
    }

    // Final update
    await supabase
      .from('migration_jobs')
      .update({
        status: 'completed',
        processed_records: processed,
        successful_records: successful,
        failed_records: failed,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('\n========================================');
    console.log('✅ IMPORT COMPLETE!');
    console.log('========================================');
    console.log(`Total Processed: ${processed}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (Object.keys(errors).length > 0) {
      console.log('\nError Summary:');
      Object.entries(errors).forEach(([error, count]) => {
        console.log(`  - ${error}... (${count} times)`);
      });
    }

    // Show sample imported clients with memberships
    console.log('\n📊 Sample clients with active memberships:');
    const { data: activeMembers } = await supabase
      .from('clients')
      .select('name, email, notes, metadata')
      .eq('organization_id', organizationId)
      .eq('source', 'migration')
      .not('notes', 'is', null)
      .like('notes', '%Active:%')
      .limit(10);

    activeMembers?.forEach(client => {
      const membership = client.metadata?.active_membership ||
                         client.notes?.match(/Active: ([^,]+)/)?.[1] ||
                         'Unknown';
      console.log(`  - ${client.name}: ${membership}`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

processWithFixedGender();