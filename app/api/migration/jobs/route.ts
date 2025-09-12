import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { migrationService } from "@/app/lib/services/migration-service";
import { getCurrentUser } from "@/app/lib/auth/organization";

/**
 * GET /api/migration/jobs
 * List migration jobs for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Get current user and verify organization access
    const user = await getCurrentUser();
    if (!user || user.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Fetch migration jobs for the organization
    const { data: jobs, error } = await supabaseAdmin
      .from("migration_dashboard")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching migration jobs:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch migration jobs" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
    });
  } catch (error) {
    console.error("Migration jobs API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/migration/jobs
 * Create a new migration job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, name, description, sourcePlatform, settings } =
      body;

    // Validate required fields
    if (!organizationId || !name || !sourcePlatform) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current user and verify organization access
    const user = await getCurrentUser();
    if (!user || user.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Create migration job
    const jobId = await migrationService.createMigrationJob(
      {
        organizationId,
        name,
        description,
        sourcePlatform,
        settings: settings || {
          skipDuplicates: true,
          validateData: true,
          createBackup: false,
          batchSize: 100,
        },
      },
      user.id,
    );

    return NextResponse.json({
      success: true,
      jobId,
    });
  } catch (error) {
    console.error("Migration job creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create migration job" },
      { status: 500 },
    );
  }
}
