import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Get job status
    const { data: job, error: jobError } = await supabaseAdmin
      .from("meal_plan_jobs")
      .select(
        `
        *,
        meal_plans (*)
      `,
      )
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if user has access to this job
    if (job.organization_id !== userWithOrg.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Return job status and data
    const response: any = {
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    };

    // Include skeleton data for pending/processing jobs
    if (job.status === "pending" || job.status === "processing") {
      response.skeleton = job.skeleton_data;
      response.message = "Your meal plan is still being generated...";
    }

    // Include full meal plan for completed jobs
    if (job.status === "completed" && job.meal_plans) {
      response.data = job.meal_plans;
      response.message = "Your meal plan is ready!";
    }

    // Include error for failed jobs
    if (job.status === "failed") {
      response.error = job.error_message || "Meal plan generation failed";
      response.message = "Please try generating again";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return createErrorResponse(error);
  }
}
