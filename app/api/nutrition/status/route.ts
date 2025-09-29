import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Public endpoint to check nutrition system status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());

    // This is a public status check - no auth required
    const status = {
      tables: {
        bookings: false,
        class_credits: false,
        leads: false,
        nutrition_profiles: false,
      },
      columns: {
        nutrition_profiles_client_id: false,
        nutrition_profiles_lead_id: false,
        organization_staff_permissions: false,
      },
      overall: false,
    };

    // Check each table exists
    try {
      const { error } = await supabase.from("bookings").select("id").limit(1);
      status.tables.bookings = !error || error.code !== "PGRST204";
    } catch (e) {
      console.error("Bookings check error:", e);
    }

    try {
      const { error } = await supabase
        .from("class_credits")
        .select("id")
        .limit(1);
      status.tables.class_credits = !error || error.code !== "PGRST204";
    } catch (e) {
      console.error("Class credits check error:", e);
    }

    try {
      const { error } = await supabase.from("leads").select("id").limit(1);
      status.tables.leads = !error || error.code !== "PGRST204";
    } catch (e) {
      console.error("Leads check error:", e);
    }

    try {
      // Check nutrition_profiles and its columns
      const { data, error } = await supabase
        .from("nutrition_profiles")
        .select("id, client_id, lead_id")
        .limit(1);

      status.tables.nutrition_profiles = !error || error.code !== "PGRST204";

      if (!error && data) {
        status.columns.nutrition_profiles_client_id = true;
        status.columns.nutrition_profiles_lead_id = true;
      }
    } catch (e) {
      console.error("Nutrition profiles check error:", e);
    }

    try {
      // Check organization_staff columns
      const { error } = await supabase
        .from("organization_staff")
        .select("permissions, is_active")
        .limit(1);

      status.columns.organization_staff_permissions = !error;
    } catch (e) {
      console.error("Organization staff check error:", e);
    }

    // Determine overall status
    status.overall =
      status.tables.bookings &&
      status.tables.class_credits &&
      status.tables.leads &&
      status.tables.nutrition_profiles &&
      status.columns.nutrition_profiles_client_id &&
      status.columns.nutrition_profiles_lead_id;

    return NextResponse.json({
      success: true,
      status,
      message: status.overall
        ? "All nutrition system components are ready"
        : "Some components are missing - migration may be needed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Status check failed",
        status: {
          tables: {},
          columns: {},
          overall: false,
        },
      },
      { status: 500 },
    );
  }
}
