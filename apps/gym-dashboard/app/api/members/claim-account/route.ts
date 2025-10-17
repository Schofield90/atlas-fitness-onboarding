import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 },
      );
    }

    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Decode the token to get the member ID
    let memberId: string;

    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      memberId = parts[0];
    } catch (err) {
      return NextResponse.json(
        { message: "Invalid claim link format" },
        { status: 400 },
      );
    }

    // Find the member by ID
    const { data: member, error: memberError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { message: "Invalid or expired claim link" },
        { status: 404 },
      );
    }

    // Check if already claimed
    if (member.user_id) {
      return NextResponse.json(
        { message: "This account has already been claimed" },
        { status: 400 },
      );
    }

    // First check if a user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === member.email,
    );

    let authUserId: string;

    if (existingUser) {
      // User already exists, update their password
      console.log("User already exists, updating password for:", member.email);

      const { data: updatedUser, error: updateAuthError } =
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: member.first_name,
            last_name: member.last_name,
            role: "member",
          },
        });

      if (updateAuthError) {
        console.error("Error updating auth user:", updateAuthError);
        return NextResponse.json(
          { message: "Failed to update user account" },
          { status: 500 },
        );
      }

      authUserId = existingUser.id;
    } else {
      // Create new auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: member.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: member.first_name,
            last_name: member.last_name,
            role: "member",
          },
        });

      if (authError) {
        console.error("Error creating auth user:", authError);
        return NextResponse.json(
          { message: "Failed to create user account" },
          { status: 500 },
        );
      }

      authUserId = authData.user.id;
    }

    // Update the client record to link it to the auth user and clear the token from metadata
    const updatedMetadata = { ...(member.metadata || {}) };
    delete updatedMetadata.claim_token;
    delete updatedMetadata.claim_token_expires_at;
    delete updatedMetadata.claim_email_sent_at;

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        user_id: authUserId,
        metadata: updatedMetadata,
        status: "active",
      })
      .eq("id", member.id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      // Only try to clean up if we created a new user (not if we updated an existing one)
      if (!existingUser) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
      return NextResponse.json(
        { message: "Failed to link account" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account claimed successfully",
      userId: authUserId,
      email: member.email,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
