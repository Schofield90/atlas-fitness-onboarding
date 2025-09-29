import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../lib/supabase/database.types";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// GET /api/team-chat/channels - Get all channels for user's organization
export async function GET(request: NextRequest) {
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

    // Get channels the user is a member of
    const { data: channels, error } = await supabase
      .from("team_channels")
      .select(
        `
        *,
        team_channel_members!inner(
          user_id,
          last_read_at,
          notifications_enabled
        )
      `,
      )
      .eq("organization_id", orgMember.org_id)
      .eq("team_channel_members.user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching channels:", error);
      return NextResponse.json(
        { error: "Failed to fetch channels" },
        { status: 500 },
      );
    }

    return NextResponse.json({ channels: channels || [] });
  } catch (error) {
    console.error("Error in GET /api/team-chat/channels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/team-chat/channels - Create a new channel
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
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check if user has permission to create channels
    if (!["owner", "admin"].includes(orgMember.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, isPrivate } = body;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Clean and validate channel name
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (cleanName.length === 0) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 },
      );
    }

    // Check if channel name already exists
    const { data: existingChannel } = await supabase
      .from("team_channels")
      .select("id")
      .eq("organization_id", orgMember.org_id)
      .eq("name", cleanName)
      .single();

    if (existingChannel) {
      return NextResponse.json(
        { error: "Channel name already exists" },
        { status: 409 },
      );
    }

    // Create the channel
    const { data: channel, error: createError } = await supabase
      .from("team_channels")
      .insert({
        organization_id: orgMember.org_id,
        name: cleanName,
        description: description || null,
        is_private: Boolean(isPrivate),
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating channel:", createError);
      return NextResponse.json(
        { error: "Failed to create channel" },
        { status: 500 },
      );
    }

    // Add the creator as a channel member
    const { error: memberError } = await supabase
      .from("team_channel_members")
      .insert({
        channel_id: channel.id,
        user_id: user.id,
        organization_id: orgMember.org_id,
        role: "admin",
      });

    if (memberError) {
      console.error("Error adding creator as member:", memberError);
      // Try to cleanup the channel if member creation fails
      await supabase.from("team_channels").delete().eq("id", channel.id);

      return NextResponse.json(
        { error: "Failed to create channel" },
        { status: 500 },
      );
    }

    // If it's a public channel, add all organization members
    if (!isPrivate) {
      const { data: allMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("org_id", orgMember.org_id)
        .neq("user_id", user.id); // Exclude creator as they're already added

      if (allMembers && allMembers.length > 0) {
        const memberships = allMembers.map((member) => ({
          channel_id: channel.id,
          user_id: member.user_id,
          organization_id: orgMember.org_id,
          role: "member" as const,
        }));

        await supabase.from("team_channel_members").insert(memberships);
      }
    }

    return NextResponse.json(
      {
        channel: {
          ...channel,
          team_channel_members: [
            {
              user_id: user.id,
              last_read_at: new Date().toISOString(),
              notifications_enabled: true,
            },
          ],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/team-chat/channels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
