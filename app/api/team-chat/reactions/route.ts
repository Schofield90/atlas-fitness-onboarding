import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../lib/supabase/database.types";

// POST /api/team-chat/reactions - Add or remove a reaction
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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
    const { message_id, emoji } = body;

    // Validate input
    if (!message_id || !emoji || typeof emoji !== "string") {
      return NextResponse.json(
        { error: "Message ID and emoji are required" },
        { status: 400 },
      );
    }

    // Validate emoji (basic check)
    if (emoji.length > 10) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Check if message exists and user can access it
    const { data: message, error: messageError } = await supabase
      .from("team_messages")
      .select(
        `
        id,
        channel_id,
        team_channels!inner(
          id,
          team_channel_members!inner(user_id)
        )
      `,
      )
      .eq("id", message_id)
      .eq("team_channels.team_channel_members.user_id", user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: "Message not found or access denied" },
        { status: 404 },
      );
    }

    // Check if user already reacted with this emoji
    const { data: existingReaction, error: reactionCheckError } = await supabase
      .from("team_message_reactions")
      .select("id")
      .eq("message_id", message_id)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .single();

    if (reactionCheckError && reactionCheckError.code !== "PGRST116") {
      console.error("Error checking existing reaction:", reactionCheckError);
      return NextResponse.json(
        { error: "Failed to check reaction" },
        { status: 500 },
      );
    }

    if (existingReaction) {
      // Remove existing reaction
      const { error: deleteError } = await supabase
        .from("team_message_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) {
        console.error("Error removing reaction:", deleteError);
        return NextResponse.json(
          { error: "Failed to remove reaction" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        action: "removed",
        message: "Reaction removed",
      });
    } else {
      // Add new reaction
      const { data: newReaction, error: addError } = await supabase
        .from("team_message_reactions")
        .insert({
          message_id,
          user_id: user.id,
          organization_id: orgMember.org_id,
          emoji,
        })
        .select(
          `
          *,
          user:users(full_name)
        `,
        )
        .single();

      if (addError) {
        console.error("Error adding reaction:", addError);
        return NextResponse.json(
          { error: "Failed to add reaction" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        action: "added",
        reaction: newReaction,
        message: "Reaction added",
      });
    }
  } catch (error) {
    console.error("Error in POST /api/team-chat/reactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
