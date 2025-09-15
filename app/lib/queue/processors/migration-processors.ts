import { supabaseAdmin } from "@/app/lib/supabase/admin";

interface ProcessClientsParams {
  jobId: string;
  organizationId: string;
  records: any[];
}

export async function processClients({
  jobId,
  organizationId,
  records,
}: ProcessClientsParams) {
  try {
    const results = {
      success: true,
      processed: 0,
      successful: 0,
      failed: 0,
      error: null as string | null,
    };

    for (const record of records) {
      try {
        const sourceData = record.source_data;

        // Extract client data from the source
        // Parse name into first and last
        const fullName =
          sourceData.Name ||
          sourceData.name ||
          `${sourceData["First Name"] || ""} ${sourceData["Last Name"] || ""}`.trim() ||
          "Unknown Client";

        const nameParts = fullName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const clientData = {
          organization_id: organizationId,
          org_id: organizationId, // Both fields for compatibility
          name: fullName,
          first_name:
            sourceData["First Name"] || sourceData.FirstName || firstName,
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

        // Check if client with same email already exists
        if (clientData.email) {
          const { data: existingClient } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("email", clientData.email)
            .single();

          if (existingClient) {
            // Update existing client
            const { error: updateError } = await supabaseAdmin
              .from("clients")
              .update({
                ...clientData,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingClient.id);

            if (updateError) {
              throw updateError;
            }

            // Create migration link
            await supabaseAdmin.from("migration_links").upsert({
              migration_record_id: record.id,
              target_table: "clients",
              target_id: existingClient.id,
              created_at: new Date().toISOString(),
            });

            results.successful++;
          } else {
            // Insert new client
            const { data: newClient, error: insertError } = await supabaseAdmin
              .from("clients")
              .insert(clientData)
              .select()
              .single();

            if (insertError) {
              throw insertError;
            }

            // Create migration link
            await supabaseAdmin.from("migration_links").upsert({
              migration_record_id: record.id,
              target_table: "clients",
              target_id: newClient.id,
              created_at: new Date().toISOString(),
            });

            results.successful++;
          }
        } else {
          // No email, insert as new client
          const { data: newClient, error: insertError } = await supabaseAdmin
            .from("clients")
            .insert(clientData)
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          // Create migration link
          await supabaseAdmin.from("migration_links").upsert({
            migration_record_id: record.id,
            target_table: "clients",
            target_id: newClient.id,
            created_at: new Date().toISOString(),
          });

          results.successful++;
        }

        results.processed++;
      } catch (error) {
        console.error("Failed to process client record:", error);
        results.failed++;
        results.error =
          error instanceof Error ? error.message : "Processing failed";
      }
    }

    return results;
  } catch (error) {
    console.error("Process clients error:", error);
    return {
      success: false,
      processed: 0,
      successful: 0,
      failed: records.length,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}
