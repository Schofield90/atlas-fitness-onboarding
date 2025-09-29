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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check class_sessions table schema
    const { data: columns, error } = await supabase
      .rpc("get_table_columns", { table_name: "class_sessions" })
      .single();

    // If that doesn't work, try a different approach
    if (error) {
      // Just try to get a sample record to see the structure
      const { data: sample, error: sampleError } = await supabase
        .from("class_sessions")
        .select("*")
        .limit(1);

      return NextResponse.json({
        method: "sample_record",
        sample_data: sample?.[0] || null,
        sample_error: sampleError?.message,
        available_columns: sample?.[0] ? Object.keys(sample[0]) : [],
      });
    }

    return NextResponse.json({
      method: "rpc_columns",
      columns: columns,
      error: null,
    });
  } catch (error: any) {
    console.error("Schema check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check schema",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
