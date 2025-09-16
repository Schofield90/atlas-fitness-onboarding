import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // First, check if the user_organizations record exists using service role
    const { data: existingRecord, error: checkError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(); // Use maybeSingle to avoid error if no rows

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json(
        {
          error: "Failed to check user_organizations",
          details: checkError,
        },
        { status: 500 },
      );
    }

    // If no record exists, create one
    if (!existingRecord) {
      const { data: newRecord, error: insertError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e", // Atlas Fitness org
          role: "owner",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          {
            error: "Failed to create user_organizations record",
            details: insertError,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Created user_organizations record",
        record: newRecord,
      });
    }

    // If record exists but is not active, activate it
    if (existingRecord && !existingRecord.is_active) {
      const { data: updatedRecord, error: updateError } = await supabase
        .from("user_organizations")
        .update({
          is_active: true,
          role: "owner",
        })
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          {
            error: "Failed to activate user_organizations record",
            details: updateError,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Activated user_organizations record",
        record: updatedRecord,
      });
    }

    // Record exists and is active
    return NextResponse.json({
      success: true,
      message: "User organization link already exists and is active",
      record: existingRecord,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
