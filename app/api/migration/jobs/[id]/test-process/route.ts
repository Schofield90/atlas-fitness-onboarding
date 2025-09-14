import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * POST /api/migration/jobs/[id]/test-process
 * Test endpoint to directly process migration without queue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[TEST-PROCESS] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting test process for job ${jobId}`);

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log(`Auth error: ${authError?.message || "No user"}`);
      return NextResponse.json(
        { success: false, error: "Unauthorized", logs },
        { status: 401 },
      );
    }
    log(`User authenticated: ${user.id}`);

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg?.organization_id) {
      log(`Org error: ${orgError?.message || "No org"}`);
      return NextResponse.json(
        { success: false, error: "User organization not found", logs },
        { status: 401 },
      );
    }
    log(`Organization found: ${userOrg.organization_id}`);

    // Get migration job with all related data
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select(
        `
        *,
        migration_files(*),
        migration_records(*)
      `,
      )
      .eq("id", jobId)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (jobError || !job) {
      log(`Job error: ${jobError?.message || "No job"}`);
      return NextResponse.json(
        { success: false, error: "Migration job not found", logs },
        { status: 404 },
      );
    }
    log(`Job found: ${job.source_system}, status: ${job.status}`);
    log(
      `Total records: ${job.total_records}, Processed: ${job.processed_records}`,
    );
    log(`Files: ${job.migration_files?.length || 0}`);
    log(`Records: ${job.migration_records?.length || 0}`);

    // Update job status to processing
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      log(`Failed to update status: ${updateError.message}`);
    } else {
      log("Updated job status to processing");
    }

    // Check if we have migration records
    if (!job.migration_records || job.migration_records.length === 0) {
      log("No migration records found - need to create them from file data");

      // Try to get the file data
      if (job.migration_files && job.migration_files.length > 0) {
        const file = job.migration_files[0];
        log(`Found file: ${file.file_name}, type: ${file.file_type}`);

        if (file.parsed_data) {
          log(
            `File has parsed data with ${Object.keys(file.parsed_data).length} rows`,
          );

          // Create migration records from parsed data
          const records = [];
          const data = file.parsed_data as any[];

          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            records.push({
              migration_job_id: jobId,
              organization_id: userOrg.organization_id,
              source_row_number: i + 1,
              source_data: row,
              status: "pending",
            });
          }

          log(`Creating ${records.length} test migration records`);

          const { error: insertError } = await supabaseAdmin
            .from("migration_records")
            .insert(records);

          if (insertError) {
            log(`Failed to create records: ${insertError.message}`);
          } else {
            log("Successfully created migration records");
          }
        } else {
          log("File has no parsed data");
        }
      } else {
        log("No files found for this job");
      }
    }

    // Process records (simplified version)
    log("Starting to process migration records");

    const { data: recordsToProcess, error: recordsError } = await supabaseAdmin
      .from("migration_records")
      .select("*")
      .eq("migration_job_id", jobId)
      .eq("status", "pending")
      .limit(10);

    if (recordsError) {
      log(`Error fetching records: ${recordsError.message}`);
    } else {
      log(`Found ${recordsToProcess?.length || 0} records to process`);

      if (recordsToProcess && recordsToProcess.length > 0) {
        // Process each record
        for (const record of recordsToProcess) {
          try {
            log(`Processing record ${record.source_row_number}`);

            // Extract data based on field mappings
            const sourceData = record.source_data;
            const fieldMappings = job.field_mappings || {};

            const clientData: any = {
              organization_id: userOrg.organization_id,
              source: "goteamup",
              source_id:
                sourceData.id || `goteamup_${record.source_row_number}`,
            };

            // Map fields
            for (const [source, target] of Object.entries(fieldMappings)) {
              if (sourceData[source]) {
                clientData[target] = sourceData[source];
              }
            }

            log(`Mapped data: ${JSON.stringify(clientData).slice(0, 200)}...`);

            // Check for existing client by email
            if (clientData.email) {
              const { data: existing } = await supabaseAdmin
                .from("clients")
                .select("id")
                .eq("organization_id", userOrg.organization_id)
                .eq("email", clientData.email)
                .single();

              if (existing) {
                log(`Found existing client with email ${clientData.email}`);

                // Update record status
                await supabaseAdmin
                  .from("migration_records")
                  .update({
                    status: "skipped",
                    processed_at: new Date().toISOString(),
                  })
                  .eq("id", record.id);

                continue;
              }
            }

            // Create new client
            const { data: newClient, error: clientError } = await supabaseAdmin
              .from("clients")
              .insert(clientData)
              .select()
              .single();

            if (clientError) {
              log(`Failed to create client: ${clientError.message}`);

              await supabaseAdmin
                .from("migration_records")
                .update({
                  status: "failed",
                  error_message: clientError.message,
                  processed_at: new Date().toISOString(),
                })
                .eq("id", record.id);
            } else {
              log(`Created client ${newClient.id}`);

              await supabaseAdmin
                .from("migration_records")
                .update({
                  status: "imported",
                  target_record_id: newClient.id,
                  processed_at: new Date().toISOString(),
                })
                .eq("id", record.id);
            }
          } catch (error: any) {
            log(`Error processing record: ${error.message}`);
          }
        }
      }
    }

    // Update job statistics
    const { data: stats } = await supabaseAdmin
      .from("migration_records")
      .select("status")
      .eq("migration_job_id", jobId);

    const processed = stats?.length || 0;
    const successful =
      stats?.filter((r) => r.status === "imported").length || 0;
    const failed = stats?.filter((r) => r.status === "failed").length || 0;

    log(
      `Final stats - Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`,
    );

    await supabaseAdmin
      .from("migration_jobs")
      .update({
        processed_records: processed,
        successful_records: successful,
        failed_records: failed,
        status: processed === job.total_records ? "completed" : "processing",
        completed_at:
          processed === job.total_records ? new Date().toISOString() : null,
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        processed,
        successful,
        failed,
      },
    });
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);
    console.error("Test process error:", error);

    // Update job status to failed
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        logs,
      },
      { status: 500 },
    );
  }
}
