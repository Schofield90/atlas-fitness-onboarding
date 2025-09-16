import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    // Get the user's organization
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    const organizationId =
      orgMember?.organization_id || "63589490-8f55-4157-bd3a-e141594b748e";

    // Update the test booking link to use the current user
    const { data: updatedLink, error: updateError } = await supabase
      .from("booking_links")
      .update({
        user_id: user.id,
        organization_id: organizationId,
      })
      .eq("slug", "test")
      .select()
      .single();

    if (updateError) {
      console.error("Error updating booking link:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update booking link",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    // Check if user has Google Calendar connected
    const { data: googleToken } = await supabase
      .from("google_calendar_tokens")
      .select("sync_enabled, calendar_id")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      booking_link: {
        slug: updatedLink.slug,
        user_id: updatedLink.user_id,
        organization_id: updatedLink.organization_id,
        url: `https://atlas-fitness-onboarding.vercel.app/book/${updatedLink.slug}`,
      },
      google_calendar: {
        connected: !!googleToken,
        sync_enabled: googleToken?.sync_enabled || false,
        calendar_id: googleToken?.calendar_id || null,
      },
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Error in update booking link user:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
