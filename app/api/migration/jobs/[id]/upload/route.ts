import { NextRequest, NextResponse } from "next/server";
import { migrationService } from "@/app/lib/services/migration-service";
import { getCurrentUser } from "@/app/lib/auth/organization";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

/**
 * POST /api/migration/jobs/[id]/upload
 * Upload files for a migration job
 */
export async function POST(
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

    if (job.organization_id !== user.organization_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file-") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files uploaded" },
        { status: 400 },
      );
    }

    // Upload files using migration service
    const uploadResults = await migrationService.uploadMigrationFiles(
      jobId,
      files,
      user.organization_id,
    );

    return NextResponse.json({
      success: true,
      files: uploadResults,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { success: false, error: "File upload failed" },
      { status: 500 },
    );
  }
}
