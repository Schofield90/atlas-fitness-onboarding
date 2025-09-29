import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = await createClient();
    const { id } = params;
    const body = await request.json();
    const { action, reason } = body;

    // Validate action
    if (!["pause", "resume", "skip"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be pause, resume, or skip.",
        },
        { status: 400 },
      );
    }

    // First verify the billing schedule exists and belongs to the organization
    const { data: existingSchedule, error: fetchError } = await supabase
      .from("billing_schedules")
      .select("id, status, customer_id, amount_cents")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Billing schedule not found" },
        { status: 404 },
      );
    }

    // Determine new status based on action
    let newStatus: string;
    let message: string;

    switch (action) {
      case "pause":
        if (existingSchedule.status === "paused") {
          return NextResponse.json(
            { success: false, error: "Billing schedule is already paused" },
            { status: 400 },
          );
        }
        newStatus = "paused";
        message = "Billing schedule paused successfully";
        break;

      case "resume":
        if (existingSchedule.status !== "paused") {
          return NextResponse.json(
            {
              success: false,
              error: "Can only resume paused billing schedules",
            },
            { status: 400 },
          );
        }
        newStatus = "scheduled";
        message = "Billing schedule resumed successfully";
        break;

      case "skip":
        if (existingSchedule.status === "skipped") {
          return NextResponse.json(
            { success: false, error: "Billing schedule is already skipped" },
            { status: 400 },
          );
        }
        newStatus = "skipped";
        message = "Billing schedule skipped successfully";
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }

    // Update the billing schedule
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Add reason to metadata if provided
    if (reason) {
      const { data: currentSchedule } = await supabase
        .from("billing_schedules")
        .select("metadata")
        .eq("id", id)
        .single();

      const currentMetadata = currentSchedule?.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        [`${action}_reason`]: reason,
        [`${action}_timestamp`]: new Date().toISOString(),
      };
    }

    const { error: updateError } = await supabase
      .from("billing_schedules")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (updateError) {
      console.error("Error updating billing schedule:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update billing schedule" },
        { status: 500 },
      );
    }

    // Log the action for audit trail (optional - could be added to a separate audit table)
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        organization_id: organizationId,
        action_type: `billing_schedule_${action}`,
        resource_type: "billing_schedule",
        resource_id: id,
        details: {
          customer_id: existingSchedule.customer_id,
          amount_cents: existingSchedule.amount_cents,
          reason: reason || null,
          previous_status: existingSchedule.status,
          new_status: newStatus,
        },
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    // Don't fail the request if audit logging fails, just log it
    if (logError) {
      console.warn("Failed to create audit log:", logError);
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error("Billing schedule action error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform action",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
