import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    // Create admin client to bypass email confirmation
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

    // First, fetch just the token
    const { data: tokenData, error: tokenError } = await supabase
      .from("account_claim_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token has expired (only if expires_at is set)
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
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

    // Now fetch the client separately
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", tokenData.client_id)
      .single();

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      console.error("Token data:", tokenData);
      return NextResponse.json(
        { error: "Client not found for this token" },
        { status: 404 },
      );
    }

    // Try to create or update user
    console.log("Processing user for email:", tokenData.email);

    let userId: string;
    let userCreated = false;

    // First, try to create the user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: tokenData.email,
        password: password,
        email_confirm: true, // This bypasses email confirmation
        user_metadata: {
          first_name: firstName || client.first_name,
          last_name: lastName || client.last_name,
          client_id: client.id,
          organization_id: tokenData.organization_id,
        },
      });

    if (authError) {
      console.log(
        "Create user error (expected if user exists):",
        authError.message,
      );

      // If user already exists, update them
      if (
        authError.message?.includes("already been registered") ||
        authError.message?.includes("already exists") ||
        authError.message?.includes("duplicate")
      ) {
        console.log("User exists, attempting to update...");

        // Get all users and find the one with matching email
        const { data: allUsers, error: listError } =
          await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          console.error("Error listing users:", listError);
          return NextResponse.json(
            { error: "Failed to check existing users" },
            { status: 500 },
          );
        }

        // Find user with matching email (case-insensitive)
        const existingUser = allUsers?.users?.find(
          (u) => u.email?.toLowerCase() === tokenData.email?.toLowerCase(),
        );

        if (!existingUser) {
          console.error("User exists but cannot be found in user list");
          return NextResponse.json(
            {
              error: "User exists but cannot be found. Please contact support.",
            },
            { status: 500 },
          );
        }

        userId = existingUser.id;
        console.log("Found existing user with ID:", userId);

        // Update the existing user's password and metadata
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
            user_metadata: {
              ...existingUser.user_metadata,
              first_name:
                firstName ||
                client.first_name ||
                existingUser.user_metadata?.first_name,
              last_name:
                lastName ||
                client.last_name ||
                existingUser.user_metadata?.last_name,
              client_id: client.id,
              organization_id: tokenData.organization_id,
            },
          });

        if (updateError) {
          console.error("Error updating existing user:", updateError);
          return NextResponse.json(
            { error: "Failed to update existing account. Please try again." },
            { status: 500 },
          );
        }

        console.log("Successfully updated existing user");
      } else {
        // Some other error occurred
        console.error("Unexpected error creating user:", authError);
        return NextResponse.json(
          { error: authError.message || "Failed to create account" },
          { status: 500 },
        );
      }
    } else {
      // User was created successfully
      userId = authData?.user?.id!;
      userCreated = true;
      console.log("User created successfully with ID:", userId);
    }

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
        is_claimed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);

    if (updateError) {
      console.error("Error updating client:", updateError);
      // Don't fail the whole process if client update fails
    }

    // Mark token as claimed
    const { error: tokenUpdateError } = await supabase
      .from("account_claim_tokens")
      .update({
        claimed_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (tokenUpdateError) {
      console.error("Error marking token as claimed:", tokenUpdateError);
      // Don't fail the whole process if token update fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: userCreated
        ? "Account created successfully"
        : "Account updated successfully",
      requiresEmailConfirmation: false,
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Error in claim account:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
