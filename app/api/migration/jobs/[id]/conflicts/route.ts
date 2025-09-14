import { NextRequest, NextResponse } from "next/server";
import { MigrationService } from "@/app/lib/services/migration-service";
import {
  getCurrentUser,
  getUserOrganization,
} from "@/app/lib/auth/organization";
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

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get user's organization
    let userOrganizationId: string;
    try {
      userOrganizationId = await getUserOrganization(user.id);
    } catch (error) {
      console.error("Error getting user organization:", error);
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

    if (job.organization_id !== userOrganizationId) {
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

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get user's organization
    let userOrganizationId: string;
    try {
      userOrganizationId = await getUserOrganization(user.id);
    } catch (error) {
      console.error("Error getting user organization:", error);
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
      conflict.organization_id !== userOrganizationId
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
