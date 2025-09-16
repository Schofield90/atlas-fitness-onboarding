import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

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

    console.log("=== EMERGENCY CLAIM ACCOUNT ENDPOINT ===");
    console.log("Processing claim for token:", token);

    // Check environment variables
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("Environment check:");
    console.log("- Has service key:", hasServiceKey);
    console.log("- Has URL:", !!supabaseUrl);
    console.log("- Has anon key:", !!anonKey);

    // Try multiple approaches to bypass auth issues

    // Approach 1: Try with admin client if service key is available
    let adminClient = null;
    if (hasServiceKey && supabaseUrl) {
      try {
        adminClient = createDirectClient(
          supabaseUrl,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        );
        console.log("Admin client created successfully");
      } catch (err) {
        console.error("Failed to create admin client:", err);
      }
    }

    // Approach 2: Use server client with bypassed RLS
    const supabase = createClient();

    // First, try to fetch the token using admin client if available, otherwise regular client
    let tokenData = null;
    let tokenError = null;

    if (adminClient) {
      console.log("Fetching token with admin client...");
      const result = await adminClient
        .from("account_claim_tokens")
        .select("*")
        .eq("token", token)
        .single();
      tokenData = result.data;
      tokenError = result.error;
    } else {
      console.log("Fetching token with regular client...");
      const result = await supabase
        .from("account_claim_tokens")
        .select("*")
        .eq("token", token)
        .single();
      tokenData = result.data;
      tokenError = result.error;
    }

    console.log("Token fetch result:", {
      tokenData: !!tokenData,
      tokenError: tokenError?.message,
    });

    if (tokenError || !tokenData) {
      console.error("Token validation error:", tokenError);
      return NextResponse.json(
        {
          error:
            "Invalid or expired token: " + (tokenError?.message || "Not found"),
        },
        { status: 400 },
      );
    }

    // Check if token has expired
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

    // Fetch the client using admin client if available
    let client = null;
    let clientError = null;

    if (adminClient) {
      console.log("Fetching client with admin client...");
      const result = await adminClient
        .from("clients")
        .select("*")
        .eq("id", tokenData.client_id)
        .single();
      client = result.data;
      clientError = result.error;
    } else {
      console.log("Fetching client with regular client...");
      const result = await supabase
        .from("clients")
        .select("*")
        .eq("id", tokenData.client_id)
        .single();
      client = result.data;
      clientError = result.error;
    }

    console.log("Client fetch result:", {
      client: !!client,
      clientError: clientError?.message,
    });

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      return NextResponse.json(
        {
          error:
            "Client not found for this token: " +
            (clientError?.message || "Not found"),
        },
        { status: 404 },
      );
    }

    // Now try to create/update the auth user
    let userId: string;
    let message = "Account successfully claimed!";

    if (adminClient) {
      console.log("Using admin API to create/update user...");

      // Check if user already exists
      const { data: existingUsers, error: listError } =
        await adminClient.auth.admin.listUsers();

      if (listError) {
        console.error("Error listing users:", listError);
        throw new Error("Failed to check existing users");
      }

      const existingUserRecord = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === tokenData.email?.toLowerCase(),
      );

      if (existingUserRecord) {
        // Update existing user
        console.log("Updating existing user:", existingUserRecord.id);
        userId = existingUserRecord.id;

        const { error: updateError } =
          await adminClient.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
            user_metadata: {
              ...existingUserRecord.user_metadata,
              client_id: client.id,
              organization_id: tokenData.organization_id,
              first_name: firstName || client.first_name,
              last_name: lastName || client.last_name,
            },
          });

        if (updateError) {
          console.error("Error updating user:", updateError);
          throw new Error("Failed to update user password");
        }

        message = "Account updated! You can now log in with your new password.";
      } else {
        // Create new user
        console.log("Creating new user for email:", tokenData.email);

        const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
            email: tokenData.email,
            password: password,
            email_confirm: true,
            user_metadata: {
              first_name: firstName || client.first_name,
              last_name: lastName || client.last_name,
              client_id: client.id,
              organization_id: tokenData.organization_id,
            },
          });

        if (authError) {
          console.error("Error creating user:", authError);
          throw new Error("Failed to create user account");
        }

        userId = authData?.user?.id!;
        console.log("User created with ID:", userId);
      }
    } else {
      // Fallback: Use regular auth API
      console.log("Using regular auth API (fallback)...");

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
        },
      });

      if (authError) {
        console.error("Auth error:", authError);

        // Try sign in if user exists
        if (
          authError.message?.includes("already registered") ||
          authError.message?.includes("already exists")
        ) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: tokenData.email,
              password: password,
            });

          if (!signInError && signInData.user) {
            userId = signInData.user.id;
            await supabase.auth.signOut();
            message = "Account already exists. You can now log in.";
          } else {
            throw new Error(
              "User exists but password doesn't match. Please use 'Forgot Password'.",
            );
          }
        } else {
          throw new Error(authError.message || "Failed to create account");
        }
      } else if (authData?.user) {
        userId = authData.user.id;

        if (!authData.user.email_confirmed_at) {
          message =
            "Account created! Please check your email to confirm your account.";
        }
      } else {
        throw new Error("Failed to create user account");
      }
    }

    // Update client record (use admin client if available for better success rate)
    console.log("Updating client record...");
    const clientUpdateData = {
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
      status: "active",
      metadata: {
        ...client.metadata,
        account_claimed_at: new Date().toISOString(),
        claim_token_used: token,
      },
      updated_at: new Date().toISOString(),
    };

    if (adminClient) {
      const { error: updateError } = await adminClient
        .from("clients")
        .update(clientUpdateData)
        .eq("id", client.id);

      if (updateError) {
        console.error("Error updating client (admin):", updateError);
      }
    } else {
      const { error: updateError } = await supabase
        .from("clients")
        .update(clientUpdateData)
        .eq("id", client.id);

      if (updateError) {
        console.error("Error updating client (regular):", updateError);
      }
    }

    // Mark token as claimed
    console.log("Marking token as claimed...");
    const tokenUpdateData = {
      claimed_at: new Date().toISOString(),
    };

    if (adminClient) {
      const { error: tokenUpdateError } = await adminClient
        .from("account_claim_tokens")
        .update(tokenUpdateData)
        .eq("token", token);

      if (tokenUpdateError) {
        console.error(
          "Error marking token as claimed (admin):",
          tokenUpdateError,
        );
      }
    } else {
      const { error: tokenUpdateError } = await supabase
        .from("account_claim_tokens")
        .update(tokenUpdateData)
        .eq("token", token);

      if (tokenUpdateError) {
        console.error(
          "Error marking token as claimed (regular):",
          tokenUpdateError,
        );
      }
    }

    console.log("Account claim completed successfully!");

    return NextResponse.json({
      success: true,
      message,
      email: tokenData.email,
      requiresEmailConfirmation:
        !adminClient && !message.includes("already exists"),
      debug: {
        usedAdminClient: !!adminClient,
        hasServiceKey,
        userId,
      },
    });
  } catch (error) {
    console.error("Error in emergency claim account:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        details: error instanceof Error ? error.stack : "Unknown error",
      },
      { status: 500 },
    );
  }
}
