import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // 60 seconds for Pro plan

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
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

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("meal_plan_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "pending") {
      return NextResponse.json(
        { message: "Job already processed", status: job.status },
        { status: 200 },
      );
    }

    // Update job status to processing
    await supabaseAdmin
      .from("meal_plan_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq("id", jobId);

    try {
      // Import the meal generation function
      const { generateMealPlan } = await import("@/app/lib/openai");

      // Update progress
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ progress: 30 })
        .eq("id", jobId);

      // Generate full meal plan
      const mealPlanData = await generateMealPlan(
        job.nutrition_profile,
        job.preferences,
        job.days_requested,
      );

      // Update progress
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({ progress: 70 })
        .eq("id", jobId);

      // Save to meal_plans table
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + job.days_requested);

      const { data: savedPlan, error: saveError } = await supabaseAdmin
        .from("meal_plans")
        .insert({
          profile_id: job.profile_id,
          client_id: job.client_id,
          organization_id: job.organization_id,
          name: `${job.days_requested}-Day AI Meal Plan`,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "active",
          duration_days: job.days_requested,
          meals_per_day: 3,
          daily_calories: job.nutrition_profile.target_calories,
          daily_protein: job.nutrition_profile.protein_grams,
          daily_carbs: job.nutrition_profile.carbs_grams,
          daily_fat: job.nutrition_profile.fat_grams,
          total_calories:
            job.nutrition_profile.target_calories * job.days_requested,
          total_protein:
            job.nutrition_profile.protein_grams * job.days_requested,
          total_carbs: job.nutrition_profile.carbs_grams * job.days_requested,
          total_fat: job.nutrition_profile.fat_grams * job.days_requested,
          meal_data: mealPlanData.meal_plan,
          shopping_list: mealPlanData.shopping_list,
          meal_prep_tips: mealPlanData.meal_prep_tips,
          ai_model: "gpt-4-turbo-preview",
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Update job as completed
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({
          status: "completed",
          progress: 100,
          meal_plan_id: savedPlan.id,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - new Date(job.created_at).getTime(),
        })
        .eq("id", jobId);

      return NextResponse.json({
        success: true,
        message: "Job processed successfully",
        mealPlanId: savedPlan.id,
      });
    } catch (error: any) {
      console.error("Processing error:", error);

      // Update job as failed
      await supabaseAdmin
        .from("meal_plan_jobs")
        .update({
          status: "failed",
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return NextResponse.json(
        { error: "Processing failed", details: error.message },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error processing job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
