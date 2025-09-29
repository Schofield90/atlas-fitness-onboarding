import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: userError,
        },
        { status: 401 },
      );
    }

    // Check if booking_links table exists and get its structure
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_name", "booking_links")
      .order("ordinal_position");

    // Try to do a simple select to test table access
    const { data: sampleData, error: selectError } = await supabase
      .from("booking_links")
      .select("*")
      .limit(1);

    // Get appointment types (if they exist)
    const { data: appointmentTypes, error: appointmentTypesError } =
      await supabase.from("appointment_types").select("*").limit(5);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      table_structure: {
        columns: columns || [],
        columnsError: columnsError?.message,
      },
      table_access: {
        sampleData: sampleData || [],
        selectError: selectError?.message,
      },
      appointment_types: {
        data: appointmentTypes || [],
        error: appointmentTypesError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        details: error?.message || error,
      },
      { status: 500 },
    );
  }
}
