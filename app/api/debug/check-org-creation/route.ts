import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "No authenticated user",
          details: userError,
        },
        { status: 401 },
      );
    }

    // Check organizations table structure
    const { data: columns, error: columnsError } = await supabase
      .from("organizations")
      .select("*")
      .limit(0);

    // Check if user already has organizations
    const { data: existingOrgs, error: orgsError } = await supabase
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", user.id);

    // Try a test insert to see what's failing
    const testOrg = {
      name: "Test Organization",
      slug: "test-org-" + Date.now(),
      type: "gym",
      phone: "+447777777777",
      email: "test@example.com",
      address: "123 Test Street",
      settings: {},
    };

    const { data: insertTest, error: insertError } = await supabase
      .from("organizations")
      .insert(testOrg)
      .select()
      .single();

    // If insert succeeded, clean it up
    if (insertTest && insertTest.id) {
      await supabase.from("organizations").delete().eq("id", insertTest.id);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      existingOrganizations: existingOrgs || [],
      organizationsTableCheck: columnsError
        ? "Error accessing table"
        : "Table accessible",
      testInsert: {
        success: !!insertTest,
        error: insertError?.message || null,
        errorDetails: insertError,
      },
      debug: {
        testData: testOrg,
        insertResult: insertTest,
        columnsError,
        orgsError,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
