import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Check tokens using regular client
    const { data: clientToken, error: clientError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .single();

    // Check tokens using admin client
    const { data: adminToken, error: adminError } = await adminSupabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .single();

    // Check sync settings
    const { data: syncSettings } = await supabase
      .from("calendar_sync_settings")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .single();

    // Check if tokens are expired
    let tokenStatus = "No token found";
    let isExpired = false;

    if (adminToken) {
      const expiryDate = new Date(adminToken.expiry_date);
      isExpired = expiryDate < new Date();
      tokenStatus = isExpired ? "Token expired" : "Token valid";
    }

    return NextResponse.json({
      userId: userWithOrg.id,
      organizationId: userWithOrg.organizationId,
      tokenCheck: {
        viaClient: {
          found: !!clientToken,
          error: clientError?.message || null,
        },
        viaAdmin: {
          found: !!adminToken,
          error: adminError?.message || null,
          tokenStatus,
          isExpired,
          expiryDate: adminToken?.expiry_date,
          hasRefreshToken: !!adminToken?.refresh_token,
        },
      },
      syncSettings: {
        found: !!syncSettings,
        data: syncSettings,
      },
      debugInfo: {
        currentTime: new Date().toISOString(),
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || "Not set",
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
