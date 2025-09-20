import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and has admin privileges
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if booking_links table has the required columns
    const { data: columns, error: columnsError } = await supabase
      .from("booking_links")
      .select("*")
      .limit(0);

    if (columnsError) {
      return NextResponse.json(
        {
          error: "Failed to check table schema",
          details: columnsError,
        },
        { status: 500 },
      );
    }

    // Try to insert a test record with the new columns
    const testData = {
      user_id: user.id,
      organization_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
      slug: `test-${Date.now()}`,
      name: "Test Booking Link",
      description: "Test description",
      type: "individual",
      max_days_in_advance: 30,
      timezone: "Europe/London",
      is_active: false, // Set to false so it doesn't appear in lists
    };

    const { data: testInsert, error: insertError } = await supabase
      .from("booking_links")
      .insert(testData)
      .select();

    if (insertError) {
      // Check if it's a column error
      if (
        insertError.message.includes("column") ||
        insertError.message.includes("max_days_in_advance")
      ) {
        return NextResponse.json(
          {
            error: "Database schema needs updating",
            message:
              "The booking_links table is missing required columns. Please contact support to apply the migration.",
            missingColumn: "max_days_in_advance",
            fullError: insertError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to create test booking link",
          details: insertError,
        },
        { status: 500 },
      );
    }

    // Clean up test record if it was created
    if (testInsert && testInsert[0]) {
      await supabase.from("booking_links").delete().eq("id", testInsert[0].id);
    }

    return NextResponse.json({
      success: true,
      message: "Booking links table schema is correct",
      hasRequiredColumns: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get table info
    const { data, error } = await supabase
      .rpc("get_table_columns", {
        table_name: "booking_links",
      })
      .catch(() => ({ data: null, error: "RPC not available" }));

    // Fallback: try to get a sample record
    const { data: sample } = await supabase
      .from("booking_links")
      .select("*")
      .limit(1);

    const columns = sample && sample[0] ? Object.keys(sample[0]) : [];

    return NextResponse.json({
      columns,
      hasMaxDaysInAdvance: columns.includes("max_days_in_advance"),
      hasType: columns.includes("type"),
      hasTimezone: columns.includes("timezone"),
      requiredColumnsPresent:
        columns.includes("max_days_in_advance") &&
        columns.includes("type") &&
        columns.includes("timezone"),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
