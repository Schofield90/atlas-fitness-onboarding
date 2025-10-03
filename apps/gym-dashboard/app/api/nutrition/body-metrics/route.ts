import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { BodyMetrics } from "@/app/lib/types/nutrition";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "30");
    const latest = searchParams.get("latest") === "true";

    // Build query
    let query = supabase
      .from("nutrition_body_metrics")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .order("date", { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    // If latest is requested, get only the most recent entry
    if (latest) {
      query = query.limit(1);
    } else {
      query = query.limit(limit);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error("Error fetching body metrics:", error);
      return createErrorResponse(error, 500);
    }

    // Calculate progress if we have multiple data points
    let progress = null;
    if (metrics && metrics.length > 1 && !latest) {
      const latestMetric = metrics[0];
      const oldestMetric = metrics[metrics.length - 1];

      progress = {
        weight_change:
          latestMetric.weight && oldestMetric.weight
            ? (latestMetric.weight - oldestMetric.weight).toFixed(1)
            : null,
        body_fat_change:
          latestMetric.body_fat_percentage && oldestMetric.body_fat_percentage
            ? (
                latestMetric.body_fat_percentage -
                oldestMetric.body_fat_percentage
              ).toFixed(1)
            : null,
        muscle_mass_change:
          latestMetric.muscle_mass && oldestMetric.muscle_mass
            ? (latestMetric.muscle_mass - oldestMetric.muscle_mass).toFixed(1)
            : null,
        days_tracked: Math.ceil(
          (new Date(latestMetric.date).getTime() -
            new Date(oldestMetric.date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      };
    }

    return NextResponse.json({
      success: true,
      data: latest ? metrics?.[0] || null : metrics,
      progress,
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/body-metrics:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const body = await request.json();

    // Validate required fields
    if (!body.date || !body.weight) {
      return NextResponse.json(
        { error: "Missing required fields: date and weight" },
        { status: 400 },
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    // Check if metrics already exist for this date
    const { data: existingMetric } = await supabase
      .from("nutrition_body_metrics")
      .select("id")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .eq("date", body.date)
      .single();

    // Prepare metric data
    const metricData: Omit<BodyMetrics, "id" | "created_at" | "updated_at"> = {
      user_id: userWithOrg.id,
      organization_id: userWithOrg.organizationId,
      date: body.date,
      weight: body.weight,
      body_fat_percentage: body.body_fat_percentage || null,
      muscle_mass: body.muscle_mass || null,
      visceral_fat: body.visceral_fat || null,
      metabolic_age: body.metabolic_age || null,
      body_water_percentage: body.body_water_percentage || null,
      bone_mass: body.bone_mass || null,
      bmr: body.bmr || null,
      inbody_scan_id: body.inbody_scan_id || null,
      notes: body.notes || null,
    };

    let result;

    if (existingMetric) {
      // Update existing metric
      const { data: updatedMetric, error: updateError } = await supabase
        .from("nutrition_body_metrics")
        .update({
          ...metricData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMetric.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating body metrics:", updateError);
        return createErrorResponse(updateError, 500);
      }

      result = updatedMetric;
    } else {
      // Create new metric
      const { data: newMetric, error: createError } = await supabase
        .from("nutrition_body_metrics")
        .insert(metricData)
        .select()
        .single();

      if (createError) {
        console.error("Error creating body metrics:", createError);
        return createErrorResponse(createError, 500);
      }

      result = newMetric;
    }

    // Update weight in nutrition profile if this is the latest measurement
    const { data: latestCheck } = await supabase
      .from("nutrition_body_metrics")
      .select("date")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (latestCheck && latestCheck.date === body.date) {
      await supabase
        .from("nutrition_profiles")
        .update({
          current_weight: body.weight,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userWithOrg.id)
        .eq("organization_id", userWithOrg.organizationId);
    }

    return NextResponse.json(
      {
        success: true,
        message: existingMetric
          ? "Body metrics updated successfully"
          : "Body metrics recorded successfully",
        data: result,
      },
      { status: existingMetric ? 200 : 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/nutrition/body-metrics:", error);
    return createErrorResponse(error);
  }
}
