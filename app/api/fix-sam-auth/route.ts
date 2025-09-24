import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const results: any = {};

    // Check organization_staff table
    const { data: staffCheck, error: staffError } = await supabase
      .from("organization_staff")
      .select("*")
      .eq("user_id", "ea1fc8e3-35a2-4c59-80af-5fde557391a1");

    if (staffError) {
      results.staffError = staffError.message;
    } else if (!staffCheck || staffCheck.length === 0) {
      // Create staff record
      const { error: insertError } = await supabase
        .from("organization_staff")
        .insert({
          user_id: "ea1fc8e3-35a2-4c59-80af-5fde557391a1",
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          role: "owner",
          is_active: true,
          permissions: ["*"],
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        results.staffInsertError = insertError.message;
      } else {
        results.staffCreated = true;
      }
    } else {
      results.staffExists = true;
      results.staffData = staffCheck[0];
    }

    // First, delete wrong organization_members record
    await supabase
      .from("organization_members")
      .delete()
      .eq("user_id", "ea1fc8e3-35a2-4c59-80af-5fde557391a1")
      .neq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e");

    // Check organization_members table for correct org
    const { data: memberCheck, error: memberError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", "ea1fc8e3-35a2-4c59-80af-5fde557391a1")
      .eq("organization_id", "63589490-8f55-4157-bd3a-e141594b748e");

    if (memberError) {
      results.memberError = memberError.message;
    } else if (!memberCheck || memberCheck.length === 0) {
      // Create member record
      const { error: insertError } = await supabase
        .from("organization_members")
        .insert({
          user_id: "ea1fc8e3-35a2-4c59-80af-5fde557391a1",
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          role: "owner",
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        results.memberInsertError = insertError.message;
      } else {
        results.memberCreated = true;
      }
    } else {
      results.memberExists = true;
      results.memberData = memberCheck[0];
    }

    // Update organization owner
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        owner_id: "ea1fc8e3-35a2-4c59-80af-5fde557391a1",
        updated_at: new Date().toISOString(),
      })
      .eq("id", "63589490-8f55-4157-bd3a-e141594b748e");

    if (updateError) {
      results.orgUpdateError = updateError.message;
    } else {
      results.orgUpdated = true;
    }

    return NextResponse.json({
      success: true,
      message: "Auth setup checked and fixed",
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
