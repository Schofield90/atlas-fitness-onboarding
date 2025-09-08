import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
    } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Fetch and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("account_claim_tokens")
      .select("*, clients(*)")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 400 },
      );
    }

    // Check if already claimed
    if (tokenData.claimed_at) {
      return NextResponse.json(
        { error: "This account has already been claimed" },
        { status: 400 },
      );
    }

    const client = tokenData.clients;
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create auth user with Supabase Admin
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: tokenData.email,
        password: password,
        email_confirm: true, // Auto-confirm email since we validated via token
        user_metadata: {
          first_name: firstName || client.first_name,
          last_name: lastName || client.last_name,
          client_id: client.id,
          organization_id: tokenData.organization_id,
        },
      });

    if (authError) {
      console.error("Error creating auth user:", authError);

      // Check if user already exists
      if (authError.message?.includes("already registered")) {
        // Update existing user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          client.user_id || "",
          { password },
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
          return NextResponse.json(
            { error: "Failed to update password" },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Failed to create user account: " + authError.message },
          { status: 500 },
        );
      }
    }

    const userId = authData?.user?.id || client.user_id;

    // Update client record with user_id and additional info
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        user_id: userId,
        first_name: firstName || client.first_name,
        last_name: lastName || client.last_name,
        phone: phone || client.phone,
        date_of_birth: dateOfBirth || client.date_of_birth,
        emergency_contact_name:
          emergencyContactName || client.emergency_contact_name,
        emergency_contact_phone:
          emergencyContactPhone || client.emergency_contact_phone,
        status: "active",
        metadata: {
          ...client.metadata,
          account_claimed_at: new Date().toISOString(),
          claim_token_used: token,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      // Don't fail the whole process if client update fails
    }

    // Mark token as claimed
    const { error: claimError } = await supabase
      .from("account_claim_tokens")
      .update({
        claimed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (claimError) {
      console.error("Error marking token as claimed:", claimError);
      // Don't fail the whole process if token update fails
    }

    // Log the activity
    await supabase.from("activity_logs").insert({
      organization_id: tokenData.organization_id,
      lead_id: client.id,
      type: "account_claimed",
      description: `Account claimed by ${firstName} ${lastName} (${tokenData.email})`,
      metadata: {
        token_id: tokenData.id,
        user_id: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account successfully claimed",
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Error in claim-account API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
