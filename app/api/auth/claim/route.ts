import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { randomBytes, pbkdf2Sync } from "crypto";

// Password hashing function
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

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

    const adminSupabase = createAdminClient();

    // Find the invitation
    const { data: invitation, error: inviteError } = await adminSupabase
      .from("client_invitations")
      .select("*, clients(*)")
      .eq("invitation_token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation token" },
        { status: 404 },
      );
    }

    if (invitation.claimed) {
      return NextResponse.json(
        { success: false, error: "This invitation has already been claimed" },
        { status: 400 },
      );
    }

    const client = invitation.clients;
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 },
      );
    }

    // Hash the password
    const passwordHash = hashPassword(password);

    // Start a transaction
    const { error: updateError } = await adminSupabase.rpc(
      "claim_client_invitation",
      {
        p_token: token,
        p_password_hash: passwordHash,
      },
    );

    if (updateError) {
      console.error("Failed to claim invitation:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to set password" },
        { status: 500 },
      );
    }

    // Create or ensure user exists in auth.users
    let userId = client.user_id;

    if (!userId) {
      // Create a new auth user
      const { data: newUser, error: createError } =
        await adminSupabase.auth.admin.createUser({
          email: client.email,
          email_confirm: true,
          user_metadata: {
            first_name: client.first_name,
            last_name: client.last_name,
            role: "client",
          },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create auth user:", createError);
        // Continue without auto-login
      } else {
        userId = newUser.user.id;

        // Update client with user_id
        await adminSupabase
          .from("clients")
          .update({ user_id: userId })
          .eq("id", client.id);
      }
    }

    // Try to create a session for auto-login
    if (userId) {
      try {
        // Generate a magic link for immediate login
        const { data: magicLinkData, error: linkError } =
          await adminSupabase.auth.admin.generateLink({
            type: "magiclink",
            email: client.email,
          });

        if (!linkError && magicLinkData?.properties?.action_link) {
          // Extract token from magic link
          const url = new URL(magicLinkData.properties.action_link);
          const magicToken = url.searchParams.get("token");

          if (magicToken) {
            // Exchange for session
            const { data: session, error: sessionError } =
              await adminSupabase.auth.verifyOtp({
                token_hash: magicToken,
                type: "magiclink",
              });

            if (!sessionError && session?.session) {
              // Return session for client-side setup
              return NextResponse.json({
                success: true,
                message: "Password set successfully",
                session: {
                  access_token: session.session.access_token,
                  refresh_token: session.session.refresh_token,
                },
              });
            }
          }
        }
      } catch (err) {
        console.error("Auto-login failed:", err);
        // Continue without auto-login
      }
    }

    // Success without auto-login
    return NextResponse.json({
      success: true,
      message:
        "Password set successfully. Please login with your email and new password.",
    });
  } catch (error) {
    console.error("Claim invitation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while setting your password",
      },
      { status: 500 },
    );
  }
}
