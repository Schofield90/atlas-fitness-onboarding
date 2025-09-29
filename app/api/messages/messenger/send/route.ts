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

  const body = await request.json();
  const { conversationId, text, attachmentUrl, attachmentType } = body;

  if (!conversationId || (!text && !attachmentUrl)) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    // Get conversation details
    const { data: conversation } = await supabase
      .from("messenger_conversations")
      .select(
        `
        *,
        contact:leads(*)
      `,
      )
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Check organization membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", conversation.organization_id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Not authorized for this organization" },
        { status: 403 },
      );
    }

    // Check 24-hour messaging window
    const lastInbound = conversation.last_inbound_at
      ? new Date(conversation.last_inbound_at)
      : null;
    const now = new Date();
    const hoursSinceLastInbound = lastInbound
      ? (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceLastInbound > 24) {
      return NextResponse.json(
        {
          error: "OUTSIDE_WINDOW",
          message:
            "Cannot send message outside 24-hour window. Last customer message was " +
            (lastInbound
              ? `${Math.floor(hoursSinceLastInbound)} hours ago`
              : "never received"),
        },
        { status: 400 },
      );
    }

    // Get page access token
    const { data: integration } = await supabase
      .from("integration_accounts")
      .select("page_access_token")
      .eq("organization_id", conversation.organization_id)
      .eq("page_id", conversation.channel_id)
      .eq("provider", "facebook")
      .eq("status", "active")
      .single();

    if (!integration) {
      return NextResponse.json(
        {
          error: "Page integration not found or inactive",
          requiresReconnect: true,
        },
        { status: 400 },
      );
    }

    // Extract PSID from external_thread_id (format: pageId:psid)
    const psid = conversation.external_thread_id.split(":")[1];
    if (!psid) {
      return NextResponse.json(
        { error: "Invalid conversation thread ID" },
        { status: 400 },
      );
    }

    // Send message via Meta API
    const client = new MetaMessengerClient(integration.page_access_token);
    let messageId: string;

    try {
      if (attachmentUrl && attachmentType) {
        messageId = await client.sendAttachment(
          psid,
          attachmentType,
          attachmentUrl,
        );
      } else {
        messageId = await client.sendMessage(psid, text);
      }
    } catch (error: any) {
      if (error.message.includes("OUTSIDE_WINDOW")) {
        return NextResponse.json(
          {
            error: "OUTSIDE_WINDOW",
            message: "Meta API rejected: Outside 24-hour messaging window",
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // Save message to database
    const { data: message } = await supabase
      .from("messenger_messages")
      .insert({
        organization_id: conversation.organization_id,
        conversation_id: conversationId,
        contact_id: conversation.contact_id,
        provider: "facebook",
        direction: "out",
        external_message_id: messageId,
        message_type: attachmentType || "text",
        text: text || "",
        attachments: attachmentUrl
          ? [
              {
                type: attachmentType,
                url: attachmentUrl,
              },
            ]
          : [],
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update conversation
    await supabase
      .from("messenger_conversations")
      .update({
        last_outbound_at: new Date().toISOString(),
        unread_count: 0, // Reset unread on reply
      })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
