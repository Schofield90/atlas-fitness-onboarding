import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use the known organization ID
    const organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

    // Get the Facebook integration
    const { data: integration } = await supabase
      .from("facebook_integrations")
      .select("access_token, facebook_user_id, facebook_user_name")
      .or(`organization_id.eq.${organizationId},user_id.eq.${user.id}`)
      .eq("is_active", true)
      .single();

    if (!integration || !integration.access_token) {
      return NextResponse.json(
        {
          error: "No active Facebook integration found",
          suggestion: "Please reconnect your Facebook account",
        },
        { status: 400 },
      );
    }

    // Test the token with Facebook API
    const meResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${integration.access_token}`,
    );

    const meData = await meResponse.json();

    if (meData.error) {
      return NextResponse.json({
        tokenValid: false,
        error: meData.error.message,
        errorCode: meData.error.code,
        suggestion:
          meData.error.code === 190
            ? "Token expired. Please reconnect Facebook."
            : "Token error. Please check permissions.",
      });
    }

    // Try to fetch pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category&access_token=${integration.access_token}`,
    );

    const pagesData = await pagesResponse.json();

    return NextResponse.json({
      tokenValid: true,
      user: {
        id: meData.id,
        name: meData.name,
        email: meData.email,
      },
      pages: {
        count: pagesData.data?.length || 0,
        hasPages: (pagesData.data?.length || 0) > 0,
        list:
          pagesData.data?.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
          })) || [],
      },
      suggestion:
        pagesData.data?.length === 0
          ? "Token is valid but no pages found. Make sure you have admin access to at least one Facebook page."
          : 'Token is valid and pages are accessible. Click "Sync Pages from Facebook" to import them.',
    });
  } catch (error) {
    console.error("Token test error:", error);
    return NextResponse.json(
      {
        error: "Failed to test token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
