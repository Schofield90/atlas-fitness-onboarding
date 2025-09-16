import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("Test import endpoint called");

  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: authError?.message,
        },
        { status: 401 },
      );
    }

    // Check organization membership
    let organizationId: string | null = null;

    // Check organization_staff table (new structure)
    const { data: staffOrg, error: staffError } = await supabase
      .from("organization_staff")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (staffOrg?.organization_id) {
      organizationId = staffOrg.organization_id;
    } else {
      // Fallback to organization_members table (old structure)
      const { data: memberOrg, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (memberOrg?.organization_id) {
        organizationId = memberOrg.organization_id;
      }
    }

    // Check if user has any clients (to verify organization access)
    const { data: clientsCheck, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .limit(1);

    // Check customers table too
    const { data: customersCheck, error: customersError } = await supabase
      .from("customers")
      .select("id")
      .limit(1);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      organizationId,
      hasClients: clientsCheck && clientsCheck.length > 0,
      hasCustomers: customersCheck && customersCheck.length > 0,
      message: organizationId
        ? "Organization found, import should work"
        : "No organization found - you may need to set up organization membership",
    });
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        error: error.message || "Test failed",
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
