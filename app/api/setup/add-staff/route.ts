import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const adminSupabase = createAdminClient();

    // Get the request body
    const body = await request.json();
    const { phoneNumber, email } = body;

    if (!phoneNumber || !email) {
      return NextResponse.json(
        {
          error: "Phone number and email are required",
        },
        { status: 400 },
      );
    }

    // Check if user is already a staff member
    const { data: existingStaff } = await adminSupabase
      .from("organization_staff")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .eq("user_id", userWithOrg.id)
      .single();

    if (existingStaff) {
      // Update existing staff record
      const { error } = await adminSupabase
        .from("organization_staff")
        .update({
          phone_number: phoneNumber,
          email: email,
          is_available: true,
          receives_calls: true,
          receives_sms: true,
          receives_whatsapp: true,
          receives_emails: true,
        })
        .eq("id", existingStaff.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Staff record updated successfully",
        staffId: existingStaff.id,
      });
    } else {
      // Create new staff record
      const { data: newStaff, error } = await adminSupabase
        .from("organization_staff")
        .insert({
          organization_id: userWithOrg.organizationId,
          user_id: userWithOrg.id,
          phone_number: phoneNumber,
          email: email,
          is_available: true,
          receives_calls: true,
          receives_sms: true,
          receives_whatsapp: true,
          receives_emails: true,
          routing_priority: 100,
          role: "owner", // Assuming you're the owner for now
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Staff record created successfully",
        staffId: newStaff.id,
      });
    }
  } catch (error: any) {
    console.error("Error setting up staff:", error);
    return NextResponse.json(
      {
        error: "Failed to set up staff member",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
