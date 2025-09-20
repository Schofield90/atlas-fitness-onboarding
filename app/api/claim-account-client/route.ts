import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

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

    // First, fetch the token
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

    // Fetch the client
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

    // Try to sign up the user (this will either create or return existing user error)
    console.log("Attempting to sign up user:", tokenData.email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tokenData.email,
      password: password,
      options: {
        data: {
          first_name: firstName || client.first_name,
          last_name: lastName || client.last_name,
          client_id: client.id,
          organization_id: tokenData.organization_id,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/login`,
      },
    });

    let userId: string | undefined;
    let requiresEmailConfirmation = false;
    let message = "Account created successfully";

    if (authError) {
      console.error("Sign up error:", authError);

      // Check if user already exists
      if (
        authError.message?.includes("already registered") ||
        authError.message?.includes("already exists") ||
        authError.status === 400
      ) {
        // User exists - try to sign in to verify the password works
        console.log("User may already exist, attempting sign in...");

        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: tokenData.email,
            password: password,
          });

        if (!signInError && signInData.user) {
          // Sign in successful - user exists and password is correct
          userId = signInData.user.id;
          message =
            "Account already exists. You can now log in with your email and password.";

          // Sign out immediately since this is just account claiming
          await supabase.auth.signOut();
        } else {
          // User exists but password doesn't match or other error
          console.log("Sign in failed:", signInError);
          return NextResponse.json({
            success: true,
            message:
              "An account with this email already exists. If this is your account, please use the 'Forgot Password' link to reset your password.",
            requiresPasswordReset: true,
            email: tokenData.email,
          });
        }
      } else {
        // Some other error
        return NextResponse.json(
          { error: authError.message || "Failed to create account" },
          { status: 500 },
        );
      }
    } else if (authData?.user) {
      // Sign up successful
      userId = authData.user.id;

      // Check if email confirmation is required
      if (authData.user.email_confirmed_at === null) {
        requiresEmailConfirmation = true;
        message =
          "Account created! Please check your email to confirm your account.";
      } else {
        message = "Account created successfully!";
      }
    }

    // Update client record if we have a user ID
    if (userId) {
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
        // Don't fail the whole process
      }
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
      // Don't fail the whole process
    }

    // Return success
    return NextResponse.json({
      success: true,
      message,
      requiresEmailConfirmation,
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
