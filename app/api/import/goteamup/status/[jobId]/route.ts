import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { migrationService } from "@/app/lib/services/migration-service";

export const runtime = "nodejs"; // Ensure Node runtime
export const dynamic = "force-dynamic"; // No caching

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Use admin client - no auth needed for status checks
    const supabase = createAdminClient();

    // Get migration progress
    const progress = await migrationService.getMigrationProgress(jobId);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    console.error("Error getting import status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get import status" },
      { status: 500 },
    );
  }
}

// Resume failed import
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Use admin client - no auth needed for status checks
    const supabase = createAdminClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if job can be resumed
    if (job.status !== "failed" && job.status !== "processing") {
      return NextResponse.json(
        { error: "Job cannot be resumed" },
        { status: 400 },
      );
    }

    // Reset job status for retry
    await supabase
      .from("migration_jobs")
      .update({
        status: "pending",
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", jobId);

    // Restart processing
    await migrationService.processMigrationData(jobId);

    return NextResponse.json({
      success: true,
      message: "Import resumed successfully",
    });
  } catch (error: any) {
    console.error("Error resuming import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resume import" },
      { status: 500 },
    );
  }
}

// Cancel running import
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Use admin client - no auth needed for status checks
    const supabase = createAdminClient();

    // Cancel the migration job
    await migrationService.cancelMigrationJob(jobId);

    return NextResponse.json({
      success: true,
      message: "Import cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel import" },
      { status: 500 },
    );
  }
}
