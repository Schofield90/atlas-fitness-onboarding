import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Ensure this runs on Node.js runtime, not Edge
export const runtime = "nodejs";

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

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Token and password are required" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Create admin client with service role key for server-side operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Log claim attempt IP and user agent
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Validate token using admin client (bypasses RLS)
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("account_claim_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      // Log failed attempt
      await supabaseAdmin.rpc("log_claim_attempt", {
        p_token: token,
        p_client_id: null,
        p_success: false,
        p_error_message: "Invalid token",
        p_ip_address: ip,
        p_user_agent: userAgent,
      });

      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token has been claimed
    if (tokenData.claimed_at) {
      // Log failed attempt
      await supabaseAdmin.rpc("log_claim_attempt", {
        p_token: token,
        p_client_id: tokenData.client_id,
        p_success: false,
        p_error_message: "Token already claimed",
        p_ip_address: ip,
        p_user_agent: userAgent,
      });

      return NextResponse.json(
        { success: false, error: "This account has already been claimed" },
        { status: 400 },
      );
    }

    // Check if token has expired (only if expires_at is set)
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      // Log failed attempt
      await supabaseAdmin.rpc("log_claim_attempt", {
        p_token: token,
        p_client_id: tokenData.client_id,
        p_success: false,
        p_error_message: "Token expired",
        p_ip_address: ip,
        p_user_agent: userAgent,
      });

      return NextResponse.json(
        { success: false, error: "This link has expired" },
        { status: 400 },
      );
    }

    // Fetch the client record
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", tokenData.client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: "Client record not found" },
        { status: 404 },
      );
    }

    // Check organization linkage
    if (client.organization_id !== tokenData.organization_id) {
      return NextResponse.json(
        { success: false, error: "Organization mismatch" },
        { status: 403 },
      );
    }

    let userId: string;
    let isNewUser = false;

    // Check if user already exists by listing all users
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return NextResponse.json(
        { success: false, error: "Failed to check existing users" },
        { status: 500 },
      );
    }

    const existingUser = users?.find(
      (u) => u.email?.toLowerCase() === tokenData.email?.toLowerCase(),
    );

    if (existingUser) {
      // User exists - update their password and metadata
      userId = existingUser.id;

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            first_name: firstName || client.first_name,
            last_name: lastName || client.last_name,
            client_id: client.id,
            organization_id: tokenData.organization_id,
          },
        });

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update account" },
          { status: 500 },
        );
      }
    } else {
      // Create new user with admin API (bypasses email confirmation)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: tokenData.email,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: firstName || client.first_name,
            last_name: lastName || client.last_name,
            client_id: client.id,
            organization_id: tokenData.organization_id,
          },
        });

      if (authError) {
        console.error("Error creating user:", authError);
        return NextResponse.json(
          {
            success: false,
            error: authError.message || "Failed to create account",
          },
          { status: 500 },
        );
      }

      userId = authData.user.id;
      isNewUser = true;
    }

    // Update client record with user_id and additional info
    const clientUpdates = {
      user_id: userId,
      first_name: firstName || client.first_name,
      last_name: lastName || client.last_name,
      phone: phone || client.phone,
      date_of_birth: dateOfBirth || client.date_of_birth,
      emergency_contact_name:
        emergencyContactName || client.emergency_contact_name,
      emergency_contact_phone:
        emergencyContactPhone || client.emergency_contact_phone,
      is_claimed: true,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update(clientUpdates)
      .eq("id", client.id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      // Don't fail the whole process
    }

    // Mark token as claimed
    const { error: tokenUpdateError } = await supabaseAdmin
      .from("account_claim_tokens")
      .update({
        claimed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (tokenUpdateError) {
      console.error("Error marking token as claimed:", tokenUpdateError);
      // Don't fail the whole process
    }

    // Log successful claim
    await supabaseAdmin.rpc("log_claim_attempt", {
      p_token: token,
      p_client_id: tokenData.client_id,
      p_success: true,
      p_error_message: null,
      p_ip_address: ip,
      p_user_agent: userAgent,
    });

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      organization_id: tokenData.organization_id,
      lead_id: client.id,
      type: "account_claimed",
      description: `Account claimed by ${firstName || client.first_name} ${lastName || client.last_name}`,
      metadata: {
        token_id: tokenData.id,
        user_id: userId,
        is_new_user: isNewUser,
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: isNewUser
        ? "Account created successfully!"
        : "Account updated successfully!",
      email: tokenData.email,
      requiresEmailConfirmation: false, // Email is auto-confirmed via admin API
      redirectUrl: "/portal/login",
    });
  } catch (error) {
    console.error("Error in claim account:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
