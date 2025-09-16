import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get organization
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 400 },
    );
  }

  // Generate CSRF state with organization ID
  const state = crypto.randomBytes(32).toString("hex");

  // Store state in database for verification
  await supabase.from("oauth_states").insert({
    state,
    user_id: user.id,
    organization_id: member.organization_id,
    provider: "facebook",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
  });

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri:
      process.env.META_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_URL}/api/integrations/meta/callback`,
    state,
    scope:
      "pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list",
    response_type: "code",
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
