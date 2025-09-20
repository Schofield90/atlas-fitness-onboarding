import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const createNotificationSchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  data: z.record(z.any()).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  expires_at: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // Create notification using the existing notifications table structure
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        organization_id: userOrg.organization_id,
        type: "push", // Using push type for internal notifications
        template: validatedData.type,
        recipient_name: validatedData.title,
        subject: validatedData.title,
        body: validatedData.message,
        status: "sent", // Mark as sent since it's an internal notification
        metadata: {
          ...validatedData.data,
          priority: validatedData.priority,
          created_by: user.id,
          is_internal: true,
          is_read: false,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Fetch internal notifications only
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .eq("type", "push") // Only get internal notifications
      .contains("metadata", { is_internal: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.contains("metadata", { is_read: false });
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
