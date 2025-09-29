import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { MetaMessengerClient } from "@/app/lib/meta/client";
import { decrypt } from "@/app/lib/encryption";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { integrationId } = await request.json();

  if (!integrationId) {
    return NextResponse.json(
      { error: "Missing integration ID" },
      { status: 400 },
    );
  }

  try {
    // Get integration details
    const { data: integration } = await supabase
      .from("integration_accounts")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    // Verify user has access to this organization
    const { data: member } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", integration.organization_id)
      .single();

    if (!member || !["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Try to unsubscribe from webhooks (may fail if token is revoked)
    try {
      const decryptedToken = decrypt(integration.page_access_token);
      const client = new MetaMessengerClient();
      await client.unsubscribePageFromWebhooks(
        integration.page_id,
        decryptedToken,
      );
    } catch (error) {
      console.log(
        "Failed to unsubscribe webhooks (token may be revoked):",
        error,
      );
    }

    // Mark integration as revoked
    await supabase
      .from("integration_accounts")
      .update({
        status: "revoked",
        page_access_token: "", // Clear token
        error_message: "Manually disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);

    // Archive all conversations for this page
    await supabase
      .from("messenger_conversations")
      .update({ status: "archived" })
      .eq("organization_id", integration.organization_id)
      .eq("channel_id", integration.page_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      {
        error: "Failed to disconnect",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
