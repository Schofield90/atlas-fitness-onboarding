import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

// GET - Fetch billing settings
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = createAdminClient();

    const { data: settings, error } = await supabase
      .from("organization_billing_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (error) {
      console.error("Error fetching billing settings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to load settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Billing settings GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update billing settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const organizationId = user.organizationId;

    // Check if user has permission (owner/admin only)
    if (!["owner", "admin"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      billing_mode,
      require_manual_approval,
      allow_auto_billing,
      migration_status,
      migration_started_at,
      notes,
    } = body;

    const supabase = createAdminClient();

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (billing_mode !== undefined) updates.billing_mode = billing_mode;
    if (require_manual_approval !== undefined) updates.require_manual_approval = require_manual_approval;
    if (allow_auto_billing !== undefined) updates.allow_auto_billing = allow_auto_billing;
    if (migration_status !== undefined) updates.migration_status = migration_status;
    if (migration_started_at !== undefined) updates.migration_started_at = migration_started_at;
    if (notes !== undefined) updates.notes = notes;

    // If completing migration, set completed date
    if (migration_status === "completed" && updates.migration_completed_at === undefined) {
      updates.migration_completed_at = new Date().toISOString();
    }

    const { data: settings, error } = await supabase
      .from("organization_billing_settings")
      .update(updates)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating billing settings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Billing settings PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
