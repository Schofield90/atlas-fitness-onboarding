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

    // Try to create user with admin client to bypass email confirmation
    console.log("Attempting to create new user for:", tokenData.email);

    // First check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(
      (u) => u.email === tokenData.email,
    );

    let userId: string;

    if (userExists) {
      // User already exists - update their password and link to client
      console.log(
        "User already exists with this email, updating password and linking to client record",
      );

      // Find the existing user
      const existingUserRecord = existingUser?.users?.find(
        (u) => u.email === tokenData.email,
      );

      if (existingUserRecord) {
        userId = existingUserRecord.id;

        // Update the user's password using admin API
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
            user_metadata: {
              ...existingUserRecord.user_metadata,
              client_id: client.id,
              organization_id: tokenData.organization_id,
            },
          });

        if (updateError) {
          console.error("Error updating user password:", updateError);
          return NextResponse.json(
            {
              error: "Failed to update account password. Please try again.",
            },
            { status: 500 },
          );
        }

        console.log("Password updated successfully for existing user:", userId);
      } else {
        return NextResponse.json(
          {
            error: "Unable to link existing account. Please contact support.",
          },
          { status: 500 },
        );
      }
    } else {
      // Create user with admin API - this bypasses email confirmation
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
        console.error("Error creating auth user:", authError);
        return NextResponse.json(
          {
            error: authError.message || "Failed to create account",
          },
          { status: 500 },
        );
      }

      userId = authData?.user?.id!;
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
      description: `Account claimed by ${firstName || client.first_name} ${lastName || client.last_name} (${tokenData.email})`,
      metadata: {
        token_id: tokenData.id,
        user_id: userId,
      },
    });

    // Account is created and confirmed - user can log in immediately
    return NextResponse.json({
      success: true,
      message: "Account successfully claimed! You can now log in.",
      email: tokenData.email,
      requiresEmailConfirmation: false,
    });
  } catch (error) {
    console.error("Error in claim-account API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
