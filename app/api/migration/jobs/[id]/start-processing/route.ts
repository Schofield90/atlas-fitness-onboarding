import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { processClients } from "@/app/lib/queue/processors/migration-processors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;
    console.log("Starting processing for job:", jobId);

    const supabase = createAdminClient();

    // Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get the job and verify ownership
    const supabaseAdmin = createAdminClient();
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("*, migration_records(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // Update job status to processing
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Failed to update job status:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update job status" },
        { status: 500 },
      );
    }

    // Get all pending migration records
    const supabaseAdminForRecords = createAdminClient();
    const { data: records, error: recordsError } = await supabaseAdminForRecords
      .from("migration_records")
      .select("*")
      .eq("migration_job_id", jobId)
      .eq("status", "pending")
      .order("source_row_number", { ascending: true });

    if (recordsError) {
      console.error("Failed to fetch records:", recordsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch records" },
        { status: 500 },
      );
    }

    console.log(`Found ${records?.length || 0} records to process`);

    // Process records in batches
    const batchSize = 10;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < (records?.length || 0); i += batchSize) {
      const batch = records?.slice(i, i + batchSize) || [];

      // Process each record in the batch
      for (const record of batch) {
        try {
          // Process the client data
          const result = await processClients({
            jobId,
            organizationId: job.organization_id,
            records: [record],
          });

          if (result.success) {
            successCount++;

            // Update record status
            const supabaseAdminForSuccess = createAdminClient();
            await supabaseAdminForSuccess
              .from("migration_records")
              .update({
                status: "completed",
                processed_at: new Date().toISOString(),
              })
              .eq("id", record.id);
          } else {
            failedCount++;

            // Update record status with error
            const supabaseAdminForError = createAdminClient();
            await supabaseAdminForError
              .from("migration_records")
              .update({
                status: "failed",
                processed_at: new Date().toISOString(),
                error_message: result.error,
              })
              .eq("id", record.id);
          }
        } catch (error) {
          failedCount++;
          console.error(`Failed to process record ${record.id}:`, error);

          const supabaseAdminForFailure = createAdminClient();
          await supabaseAdminForFailure
            .from("migration_records")
            .update({
              status: "failed",
              processed_at: new Date().toISOString(),
              error_message:
                error instanceof Error ? error.message : "Processing failed",
            })
            .eq("id", record.id);
        }

        processedCount++;

        // Update job progress
        const supabaseAdminForProgress = createAdminClient();
        await supabaseAdminForProgress
          .from("migration_jobs")
          .update({
            processed_records: processedCount,
            successful_records: successCount,
            failed_records: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }

    // Update final job status
    const finalStatus =
      failedCount === 0 ? "completed" : "completed_with_errors";
    const supabaseAdminForFinal = createAdminClient();
    await supabaseAdminForFinal
      .from("migration_jobs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        processed_records: processedCount,
        successful_records: successCount,
        failed_records: failedCount,
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      data: {
        processed: processedCount,
        successful: successCount,
        failed: failedCount,
        status: finalStatus,
      },
    });
  } catch (error) {
    console.error("Processing error:", error);

    // Update job status to failed
    const supabaseAdminForFailedJob = createAdminClient();
    await supabaseAdminForFailedJob
      .from("migration_jobs")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 },
    );
  }
}
