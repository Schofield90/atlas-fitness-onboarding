import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  ONBOARDING_STEPS,
  ONBOARDING_CATEGORIES,
  calculateProgress,
  isOnboardingComplete,
} from "@/app/lib/onboarding/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/onboarding/status
 * Returns the current onboarding status for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireAuth();
    const admin = createAdminClient();

    // Get or create onboarding record
    let { data: onboarding } = await admin
      .from("organization_onboarding")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!onboarding) {
      // Create new onboarding record
      const { data: newOnboarding, error } = await admin
        .from("organization_onboarding")
        .insert({
          organization_id: organizationId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating onboarding record:", error);
        throw new Error("Failed to initialize onboarding");
      }

      onboarding = newOnboarding;
    }

    // Verify all steps and get completion status
    const stepStatuses = await Promise.all(
      ONBOARDING_STEPS.map(async (step) => {
        let isCompleted = false;

        try {
          // Check if step is marked as completed
          const completedSteps = (onboarding?.completed_steps ||
            []) as string[];
          if (completedSteps.includes(step.id)) {
            isCompleted = true;
          } else {
            // Verify step completion via verification function
            isCompleted = await step.verifyFn(organizationId);

            // If verified but not in completed_steps, add it
            if (isCompleted && !completedSteps.includes(step.id)) {
              await admin
                .from("organization_onboarding")
                .update({
                  completed_steps: [...completedSteps, step.id],
                })
                .eq("organization_id", organizationId);
            }
          }
        } catch (error) {
          console.error(`Error verifying step ${step.id}:`, error);
          // Don't fail the entire request if one verification fails
        }

        const skippedSteps = (onboarding?.skipped_steps || []) as string[];

        return {
          id: step.id,
          title: step.title,
          description: step.description,
          category: step.category,
          required: step.required,
          order: step.order,
          component: step.component,
          icon: step.icon,
          estimatedMinutes: step.estimatedMinutes,
          completed: isCompleted,
          skipped: skippedSteps.includes(step.id),
        };
      }),
    );

    const completedStepIds = stepStatuses
      .filter((s) => s.completed)
      .map((s) => s.id);
    const progress = calculateProgress(completedStepIds);
    const isComplete = isOnboardingComplete(completedStepIds);

    // Group steps by category
    const stepsByCategory = stepStatuses.reduce(
      (acc, step) => {
        if (!acc[step.category]) {
          acc[step.category] = [];
        }
        acc[step.category].push(step);
        return acc;
      },
      {} as Record<string, typeof stepStatuses>,
    );

    return NextResponse.json({
      success: true,
      data: {
        organization_id: organizationId,
        current_step: onboarding.current_step,
        completed_steps: completedStepIds,
        skipped_steps: onboarding.skipped_steps || [],
        is_complete: isComplete,
        is_dismissed: onboarding.is_dismissed,
        started_at: onboarding.started_at,
        completed_at: onboarding.completed_at,
        progress: {
          completed: progress.completed,
          total: progress.total,
          percentage: progress.percentage,
          required_completed: progress.requiredCompleted,
          required_total: progress.requiredTotal,
        },
        steps: stepStatuses,
        steps_by_category: stepsByCategory,
        categories: ONBOARDING_CATEGORIES,
      },
    });
  } catch (error: any) {
    console.error("Onboarding status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch onboarding status",
      },
      { status: 500 },
    );
  }
}
