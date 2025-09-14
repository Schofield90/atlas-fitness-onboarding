import { NextRequest, NextResponse } from "next/server";
import { MigrationService } from "@/app/lib/services/migration-service";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

const migrationService = new MigrationService();

/**
 * GET /api/migration/jobs/[id]/conflicts
 * Get conflicts for a migration job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;

    // Get current user from Supabase auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get user's organization from user_organizations table
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { success: false, error: "User organization not found" },
        { status: 401 },
      );
    }

    // Verify job exists and user has access
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("organization_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Migration job not found" },
        { status: 404 },
      );
    }

    if (job.organization_id !== userOrg.organization_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get migration conflicts
    const conflicts = await migrationService.getMigrationConflicts(jobId);

    return NextResponse.json({
      success: true,
      conflicts,
    });
  } catch (error) {
    console.error("Conflicts fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conflicts" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/migration/jobs/[id]/conflicts
 * Resolve migration conflicts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const jobId = params.id;
    const body = await request.json();
    const { conflictId, resolution } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current user from Supabase auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get user's organization from user_organizations table
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { success: false, error: "User organization not found" },
        { status: 401 },
      );
    }

    // Verify conflict exists and belongs to this job
    const { data: conflict, error: conflictError } = await supabaseAdmin
      .from("migration_conflicts")
      .select("migration_job_id, organization_id")
      .eq("id", conflictId)
      .single();

    if (conflictError || !conflict) {
      return NextResponse.json(
        { success: false, error: "Conflict not found" },
        { status: 404 },
      );
    }

    if (
      conflict.migration_job_id !== jobId ||
      conflict.organization_id !== userOrg.organization_id
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Resolve the conflict
    await migrationService.resolveMigrationConflict(
      conflictId,
      { action: resolution },
      user.id,
    );

    return NextResponse.json({
      success: true,
      message: "Conflict resolved",
    });
  } catch (error) {
    console.error("Conflict resolution error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve conflict" },
      { status: 500 },
    );
  }
}
