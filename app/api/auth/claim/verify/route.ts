import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();

    // Find the invitation with client details
    const { data: invitation, error } = await adminSupabase
      .from("client_invitations")
      .select(
        `
        *,
        clients (
          id,
          email,
          first_name,
          last_name,
          organization_id,
          password_hash,
          password_required
        ),
        organizations (
          id,
          name
        )
      `,
      )
      .eq("invitation_token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        valid: false,
        error: "Invalid invitation token",
      });
    }

    // Check if already claimed
    if (invitation.claimed) {
      return NextResponse.json({
        valid: true,
        claimed: true,
        client: {
          first_name: invitation.clients?.first_name,
          email: invitation.clients?.email,
        },
        organization: invitation.organizations?.name,
      });
    }

    // Valid and unclaimed
    return NextResponse.json({
      valid: true,
      claimed: false,
      client: {
        id: invitation.clients?.id,
        email: invitation.clients?.email,
        first_name: invitation.clients?.first_name,
        last_name: invitation.clients?.last_name,
      },
      organization: invitation.organizations?.name,
    });
  } catch (error) {
    console.error("Verify invitation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify invitation" },
      { status: 500 },
    );
  }
}
