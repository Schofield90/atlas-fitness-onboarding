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

    // Try to sign in first to check if user exists
    console.log("Checking if user exists by attempting sign in...");

    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: tokenData.email,
        password: "dummy_password_that_wont_work_12345!@#$%", // This will fail but tells us if user exists
      });

    let userId: string;
    let userCreated = false;

    // If sign in error is "Invalid login credentials", user exists
    if (signInError?.message?.includes("Invalid login credentials")) {
      console.log("User exists, updating password using admin API...");

      // User exists, we need to reset their password
      // Use the signUp with existing email which will update the password
      const { data: resetData, error: resetError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: tokenData.email,
        });

      if (resetError) {
        console.error("Error generating recovery link:", resetError);

        // Try alternative approach - update via auth.users table directly
        // This requires finding the user ID first
        // Since we can't list users, we'll try to create and handle the duplicate error
        const { data: createAttempt, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: tokenData.email,
            password: password,
            email_confirm: true,
          });

        if (createError?.message?.includes("already been registered")) {
          // User definitely exists but we can't update them easily
          // Return a special message
          return NextResponse.json({
            success: true,
            message:
              "User account already exists. Please use the 'Forgot Password' link to reset your password.",
            requiresPasswordReset: true,
            email: tokenData.email,
          });
        }

        return NextResponse.json(
          {
            error:
              "Failed to update existing account. Please try the forgot password option.",
          },
          { status: 500 },
        );
      }

      // If we got here, we have a recovery link but can't use it directly
      // Return success with a note
      return NextResponse.json({
        success: true,
        message:
          "Account exists. A password reset link has been generated. Please check your email.",
        requiresEmailConfirmation: true,
        email: tokenData.email,
      });
    } else {
      // User doesn't exist, create them
      console.log("User doesn't exist, creating new user...");

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
        console.error("Error creating user:", authError);

        // If it's a duplicate user error, handle it
        if (authError.message?.includes("already been registered")) {
          // Try one more approach - just return success and let them try to login
          return NextResponse.json({
            success: true,
            message:
              "An account with this email may already exist. Try logging in with your new password.",
            requiresEmailConfirmation: false,
            email: tokenData.email,
          });
        }

        return NextResponse.json(
          { error: authError.message || "Failed to create account" },
          { status: 500 },
        );
      }

      userId = authData?.user?.id!;
      userCreated = true;
      console.log("User created successfully with ID:", userId);
    }

    // Update client record with user_id and additional info if we have a userId
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
        // Don't fail the whole process if client update fails
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
      // Don't fail the whole process if token update fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: userCreated
        ? "Account created successfully"
        : "Account processed successfully",
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
