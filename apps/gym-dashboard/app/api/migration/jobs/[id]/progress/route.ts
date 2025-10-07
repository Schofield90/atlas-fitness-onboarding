import { NextRequest, NextResponse } from "next/server";
import { migrationService } from "@/app/lib/services/migration-service";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * GET /api/migration/jobs/[id]/progress
 * Get migration job progress and status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    // Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const organizationId = user.organizationId;

    // Verify job exists and user has access
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Migration job not found" },
        { status: 404 },
      );
    }

    if (job.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get migration progress
    const progress = await migrationService.getMigrationProgress(jobId);

    return NextResponse.json({
      success: true,
      ...progress,
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}
