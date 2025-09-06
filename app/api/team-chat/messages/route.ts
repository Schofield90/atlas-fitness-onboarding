import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "../../../lib/supabase/database.types";

// GET /api/team-chat/messages - Get messages for a channel
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // For pagination

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 },
      );
    }

    // Check if user is a member of the channel
    const { data: membership, error: membershipError } = await supabase
      .from("team_channel_members")
      .select("channel_id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from("team_messages")
      .select(
        `
        *,
        user:users(id, full_name, avatar_url, email),
        team_message_reactions(
          id,
          emoji,
          user_id,
          user:users(full_name)
        ),
        team_message_attachments(
          id,
          file_name,
          file_type,
          file_url,
          thumbnail_url
        )
      `,
      )
      .eq("channel_id", channelId)
      .is("thread_id", null) // Only get top-level messages
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100)); // Cap at 100 messages

    // Add pagination if specified
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    // Reverse to get chronological order (oldest first)
    const sortedMessages = messages?.reverse() || [];

    return NextResponse.json({ messages: sortedMessages });
  } catch (error) {
    console.error("Error in GET /api/team-chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/team-chat/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { channel_id, content, thread_id, attachments } = body;

    // Validate input
    if (!channel_id || !content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Channel ID and content are required" },
        { status: 400 },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 },
      );
    }

    // Check if user is a member of the channel
    const { data: membership, error: membershipError } = await supabase
      .from("team_channel_members")
      .select("channel_id")
      .eq("channel_id", channel_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Determine message type
    let messageType = "text";
    if (attachments && attachments.length > 0) {
      messageType = "file";
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from("team_messages")
      .insert({
        channel_id,
        user_id: user.id,
        organization_id: orgMember.org_id,
        content: content.trim(),
        message_type: messageType,
        thread_id: thread_id || null,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    // Process mentions
    const mentionMatches = content.match(/@(\w+)/g);
    if (mentionMatches && mentionMatches.length > 0) {
      const mentions = [];

      for (const mention of mentionMatches) {
        const username = mention.substring(1);

        // Find users by email or name (simplified search)
        const { data: mentionedUsers } = await supabase
          .from("users")
          .select("id")
          .or(`email.ilike.%${username}%,full_name.ilike.%${username}%`)
          .limit(1);

        if (mentionedUsers && mentionedUsers.length > 0) {
          // Check if mentioned user is in the organization
          const { data: mentionedMember } = await supabase
            .from("organization_members")
            .select("user_id")
            .eq("org_id", orgMember.org_id)
            .eq("user_id", mentionedUsers[0].id)
            .single();

          if (mentionedMember) {
            mentions.push({
              message_id: message.id,
              mentioned_user_id: mentionedUsers[0].id,
              mentioned_by_user_id: user.id,
              organization_id: orgMember.org_id,
              mention_type: "user",
            });
          }
        }
      }

      if (mentions.length > 0) {
        await supabase.from("team_mentions").insert(mentions);
      }
    }

    // Return the message with user data
    const { data: fullMessage, error: fetchError } = await supabase
      .from("team_messages")
      .select(
        `
        *,
        user:users(id, full_name, avatar_url, email),
        team_message_reactions(
          id,
          emoji,
          user_id,
          user:users(full_name)
        ),
        team_message_attachments(
          id,
          file_name,
          file_type,
          file_url,
          thumbnail_url
        )
      `,
      )
      .eq("id", message.id)
      .single();

    if (fetchError) {
      console.error("Error fetching created message:", fetchError);
      return NextResponse.json(
        { error: "Message sent but failed to fetch details" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: fullMessage }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/team-chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/team-chat/messages - Update a message
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 },
      );
    }

    // Check if user owns the message
    const { data: message, error: messageError } = await supabase
      .from("team_messages")
      .select("id, user_id, channel_id")
      .eq("id", messageId)
      .eq("user_id", user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: "Message not found or access denied" },
        { status: 404 },
      );
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from("team_messages")
      .update({
        content: content.trim(),
        edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select(
        `
        *,
        user:users(id, full_name, avatar_url, email),
        team_message_reactions(
          id,
          emoji,
          user_id,
          user:users(full_name)
        ),
        team_message_attachments(
          id,
          file_name,
          file_type,
          file_url,
          thumbnail_url
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating message:", updateError);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Error in PUT /api/team-chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/team-chat/messages - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 },
      );
    }

    // Check if user owns the message or is admin
    const { data: message, error: messageError } = await supabase
      .from("team_messages")
      .select(
        `
        id, 
        user_id, 
        channel_id,
        team_channels!inner(
          organization_id
        )
      `,
      )
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user can delete (owner of message or organization admin)
    const canDelete = message.user_id === user.id;

    if (!canDelete) {
      // Check if user is organization admin
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("role")
        .eq("org_id", (message as any).team_channels.organization_id)
        .eq("user_id", user.id)
        .single();

      if (!orgMember || !["owner", "admin"].includes(orgMember.role)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Delete the message (cascading will handle related records)
    const { error: deleteError } = await supabase
      .from("team_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/team-chat/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
