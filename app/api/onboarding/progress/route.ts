import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getStepById, isOnboardingComplete } from "@/app/lib/onboarding/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/progress
 * Update onboarding progress (complete, skip, start, dismiss)
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireAuth();
    const body = await request.json();
    const { step_id, action, metadata } = body;

    if (!action || !["complete", "skip", "start", "dismiss"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Get or create onboarding record
    let { data: onboarding } = await admin
      .from("organization_onboarding")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!onboarding) {
      const { data: newOnboarding } = await admin
        .from("organization_onboarding")
        .insert({ organization_id: organizationId })
        .select()
        .single();
      onboarding = newOnboarding;
    }

    // Handle dismiss action
    if (action === "dismiss") {
      await admin
        .from("organization_onboarding")
        .update({ is_dismissed: true })
        .eq("organization_id", organizationId);

      return NextResponse.json({
        success: true,
        message: "Onboarding dismissed",
      });
    }

    if (!step_id) {
      return NextResponse.json(
        { success: false, error: "step_id required for this action" },
        { status: 400 },
      );
    }

    // Verify step exists
    const step = getStepById(step_id);
    if (!step) {
      return NextResponse.json(
        { success: false, error: "Invalid step_id" },
        { status: 400 },
      );
    }

    const completedSteps = (onboarding.completed_steps || []) as string[];
    const skippedSteps = (onboarding.skipped_steps || []) as string[];

    // Handle skip action
    if (action === "skip") {
      // Add to skipped_steps if not already there
      if (!skippedSteps.includes(step_id)) {
        const updatedSkipped = [...skippedSteps, step_id];
        await admin
          .from("organization_onboarding")
          .update({
            skipped_steps: updatedSkipped,
            current_step:
              onboarding.current_step === step_id
                ? null
                : onboarding.current_step,
          })
          .eq("organization_id", organizationId);
      }

      return NextResponse.json({
        success: true,
        message: `Step ${step_id} skipped`,
      });
    }

    // Handle start action
    if (action === "start") {
      await admin
        .from("organization_onboarding")
        .update({ current_step: step_id })
        .eq("organization_id", organizationId);

      return NextResponse.json({
        success: true,
        message: `Started step ${step_id}`,
      });
    }

    // Handle complete action
    if (action === "complete") {
      // Add to completed_steps if not already there
      if (!completedSteps.includes(step_id)) {
        const updatedCompleted = [...completedSteps, step_id];

        // Check if all required steps are now complete
        const allComplete = isOnboardingComplete(updatedCompleted);

        const updateData: any = {
          completed_steps: updatedCompleted,
          current_step:
            onboarding.current_step === step_id
              ? null
              : onboarding.current_step,
        };

        // If metadata provided (e.g., ai_tutorial_viewed), update it
        if (metadata) {
          updateData.metadata = {
            ...(onboarding.metadata || {}),
            ...metadata,
          };
        }

        // Mark onboarding as completed if all required steps done
        if (allComplete) {
          updateData.completed_at = new Date().toISOString();
        }

        await admin
          .from("organization_onboarding")
          .update(updateData)
          .eq("organization_id", organizationId);

        return NextResponse.json({
          success: true,
          message: `Step ${step_id} completed`,
          onboarding_complete: allComplete,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Step ${step_id} already completed`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Onboarding progress error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update onboarding progress",
      },
      { status: 500 },
    );
  }
}
