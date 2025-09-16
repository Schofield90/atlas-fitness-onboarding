import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get organization ID - try multiple methods
    let organizationId = null;
    let method = null;

    // Method 1: Check organization_members table
    const { data: orgMember, error: orgMemberError } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (orgMember) {
      organizationId = orgMember.org_id;
      method = "organization_members";
    } else {
      // Method 2: Check users table for organization_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (userData?.organization_id) {
        organizationId = userData.organization_id;
        method = "users_table";
      } else {
        // Method 3: Use the known Atlas Fitness organization ID as fallback
        organizationId = "63589490-8f55-4157-bd3a-e141594b748e";
        method = "fallback";
      }
    }

    // Test insert
    const testData = {
      name: "Test Appointment Type",
      description: "Test description",
      duration_minutes: 30,
      buffer_after_minutes: 0,
      price_pennies: 0,
      is_active: true,
      organization_id: organizationId,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from("appointment_types")
      .insert(testData)
      .select()
      .single();

    // Clean up test data if successful
    if (insertedData) {
      await supabase
        .from("appointment_types")
        .delete()
        .eq("id", insertedData.id);
    }

    return NextResponse.json({
      success: !insertError,
      user_id: user.id,
      organization_id: organizationId,
      organization_method: method,
      org_member_error: orgMemberError?.message,
      insert_result: insertedData,
      insert_error: insertError
        ? {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          }
        : null,
      test_data: testData,
    });
  } catch (error) {
    console.error("Debug test error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
