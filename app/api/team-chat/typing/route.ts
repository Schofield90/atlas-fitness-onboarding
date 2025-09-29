import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../lib/supabase/database.types";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// POST /api/team-chat/typing - Set typing indicator
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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
    const { channel_id, is_typing } = body;

    // Validate input
    if (!channel_id || typeof is_typing !== "boolean") {
      return NextResponse.json(
        { error: "Channel ID and typing status are required" },
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

    if (is_typing) {
      // Set or update typing indicator
      const expiresAt = new Date(Date.now() + 10000); // 10 seconds from now

      const { error: upsertError } = await supabase
        .from("team_typing_indicators")
        .upsert({
          channel_id,
          user_id: user.id,
          organization_id: orgMember.org_id,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (upsertError) {
        console.error("Error setting typing indicator:", upsertError);
        return NextResponse.json(
          { error: "Failed to set typing indicator" },
          { status: 500 },
        );
      }
    } else {
      // Remove typing indicator
      const { error: deleteError } = await supabase
        .from("team_typing_indicators")
        .delete()
        .eq("channel_id", channel_id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error removing typing indicator:", deleteError);
        return NextResponse.json(
          { error: "Failed to remove typing indicator" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: is_typing ? "Typing indicator set" : "Typing indicator removed",
    });
  } catch (error) {
    console.error("Error in POST /api/team-chat/typing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/team-chat/typing - Get current typing indicators for a channel
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel_id");

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

    // Get current typing indicators (excluding current user)
    const { data: typingIndicators, error } = await supabase
      .from("team_typing_indicators")
      .select(
        `
        user_id,
        started_at,
        expires_at,
        user:users(full_name, email)
      `,
      )
      .eq("channel_id", channelId)
      .gt("expires_at", new Date().toISOString())
      .neq("user_id", user.id);

    if (error) {
      console.error("Error fetching typing indicators:", error);
      return NextResponse.json(
        { error: "Failed to fetch typing indicators" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      typing_users:
        typingIndicators?.map((indicator) => ({
          user_id: indicator.user_id,
          full_name:
            (indicator as any).user?.full_name ||
            (indicator as any).user?.email ||
            "Someone",
          started_at: indicator.started_at,
        })) || [],
    });
  } catch (error) {
    console.error("Error in GET /api/team-chat/typing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/team-chat/typing - Cleanup expired typing indicators
export async function DELETE() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Clean up expired typing indicators
    const { error } = await supabase.rpc("cleanup_expired_typing_indicators");

    if (error) {
      console.error("Error cleaning up typing indicators:", error);
      return NextResponse.json(
        { error: "Failed to cleanup typing indicators" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Expired typing indicators cleaned up",
    });
  } catch (error) {
    console.error("Error in DELETE /api/team-chat/typing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
