import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get search query from URL params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "sam";

    // Search for clients
    const { data: clients, error } = await supabase
      .from("clients")
      .select(
        "id, email, first_name, last_name, organization_id, user_id, created_at",
      )
      .or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching clients:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      search,
      count: clients?.length || 0,
      clients: clients || [],
      info: "Use ?search=term to search for different clients",
    });
  } catch (error) {
    console.error("Error in debug-clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
