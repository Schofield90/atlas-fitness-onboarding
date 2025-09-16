import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          userError: userError?.message,
        },
        { status: 401 },
      );
    }

    // Try with regular client
    const { data: clientData, error: clientError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id);

    // Try with admin client
    const { data: adminData, error: adminError } = await adminSupabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id);

    // Get all tokens (admin only)
    const { data: allTokens, error: allError } = await adminSupabase
      .from("google_calendar_tokens")
      .select("user_id, created_at, updated_at");

    // Try manual query with raw SQL (RPC might not exist)
    let rawQuery = null;
    let rawError = null;
    try {
      const result = await adminSupabase.rpc("get_tokens_for_user", {
        user_id_param: user.id,
      });
      rawQuery = result.data;
      rawError = result.error;
    } catch (e) {
      rawError = "RPC not available";
    }

    return NextResponse.json({
      userId: user.id,
      userIdType: typeof user.id,
      clientQuery: {
        data: clientData,
        error: clientError,
        count: clientData?.length || 0,
      },
      adminQuery: {
        data: adminData?.map((t) => ({
          ...t,
          access_token: t.access_token ? "[REDACTED]" : null,
          refresh_token: t.refresh_token ? "[REDACTED]" : null,
        })),
        error: adminError,
        count: adminData?.length || 0,
      },
      allTokensCount: allTokens?.length || 0,
      allTokensUserIds: allTokens?.map((t) => t.user_id) || [],
      databaseUserIds: {
        sample: allTokens?.[0]?.user_id,
        sampleType: typeof allTokens?.[0]?.user_id,
      },
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
