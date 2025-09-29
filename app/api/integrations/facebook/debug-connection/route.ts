import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get ALL facebook_integrations for this user (not filtered by is_active)
    const { data: integrations, error } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Also get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      organization: userOrg,
      facebook_integrations: integrations || [],
      total_integrations: integrations?.length || 0,
      active_integrations: integrations?.filter((i) => i.is_active).length || 0,
      database_error: error?.message || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
