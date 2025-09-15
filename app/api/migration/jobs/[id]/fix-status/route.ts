import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const supabaseAdmin = createAdminClient();

  try {
    // Get the current job status and counts
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        success: false,
        error: "Migration job not found",
      });
    }

    // Count actual imported data
    const { count: clientCount } = await supabaseAdmin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", job.organization_id)
      .eq("source", "goteamup");

    const { count: bookingCount } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", job.organization_id)
      .eq("source", "migration");

    const { count: paymentCount } = await supabaseAdmin
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", job.organization_id);

    // Update job with correct status and counts
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        successful_records: clientCount || 0,
        total_records: clientCount || 0,
        processed_records: clientCount || 0,
        metadata: {
          ...job.metadata,
          clients_imported: clientCount || 0,
          attendance_imported: bookingCount || 0,
          payments_imported: paymentCount || 0,
          status_fixed: true,
          fixed_at: new Date().toISOString(),
        },
      })
      .eq("id", jobId);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Job status fixed successfully",
      counts: {
        clients: clientCount || 0,
        bookings: bookingCount || 0,
        payments: paymentCount || 0,
      },
    });
  } catch (error: any) {
    console.error("Fix status error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fix job status",
    });
  }
}
