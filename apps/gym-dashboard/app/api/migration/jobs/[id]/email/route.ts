import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * POST /api/migration/jobs/[id]/email
 * Save notification email for background import job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const organizationId = user.organizationId;

    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const jobId = params.id;

    // Use admin client to update job
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify job belongs to user's organization
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("id, organization_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organization_id !== organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Save email to job metadata
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        result_summary: {
          notification_email: email,
        },
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Failed to save email:", updateError);
      return NextResponse.json(
        { error: "Failed to save email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email notification enabled",
    });
  } catch (error: any) {
    console.error("Email save error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
