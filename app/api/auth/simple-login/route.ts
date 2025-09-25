import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { pbkdf2Sync } from "crypto";
import {
  checkAuthRateLimit,
  createRateLimitResponse,
} from "@/app/lib/rate-limit";

// Password verification function
function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, hash] = hashedPassword.split(":");
    if (!salt || !hash) return false;

    const verifyHash = pbkdf2Sync(password, salt, 10000, 64, "sha512").toString(
      "hex",
    );
    return hash === verifyHash;
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateLimitCheck = checkAuthRateLimit(
      request,
      "passwordLogin",
      email.toLowerCase(),
    );
    if (!rateLimitCheck.allowed) {
      return createRateLimitResponse(rateLimitCheck.resetIn);
    }

    const adminSupabase = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if this is a gym owner trying to use member portal
    const { data: ownerCheck } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("email", normalizedEmail)
      .single();

    if (ownerCheck) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This is a member portal. Gym owners should use login.gymleadhub.co.uk",
        },
        { status: 403 },
      );
    }

    // Find client by email
    const { data: client, error: clientError } = await adminSupabase
      .from("clients")
      .select(
        `
        id,
        email,
        password_hash,
        password_required,
        first_name,
        last_name,
        organization_id,
        user_id,
        client_invitations (
          invitation_token,
          claimed
        )
      `,
      )
      .eq("email", normalizedEmail)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if client has an invitation
    const invitation = client.client_invitations?.[0];

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found. Please contact your gym for an invitation.",
        },
        { status: 404 },
      );
    }

    // Check if invitation has been claimed (password set)
    if (!invitation.claimed || !client.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please use your invitation link to set up your password first.",
          needsSetup: true,
          invitationToken: invitation.invitation_token,
        },
        { status: 401 },
      );
    }

    // Verify password
    const passwordValid = verifyPassword(password, client.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create or ensure user exists
    let userId = client.user_id;

    if (!userId) {
      // Create auth user if doesn't exist
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

      if (!createError && newUser.user) {
        userId = newUser.user.id;

        // Update client with user_id
        await adminSupabase
          .from("clients")
          .update({ user_id: userId })
          .eq("id", client.id);
      }
    }

    // Generate magic link for session creation
    const { data: magicLinkData, error: linkError } =
      await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email: client.email,
      });

    if (linkError || !magicLinkData?.properties?.action_link) {
      console.error("Failed to generate session:", linkError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 },
      );
    }

    // Try to exchange magic link for session
    const url = new URL(magicLinkData.properties.action_link);
    const token = url.searchParams.get("token");

    if (token) {
      const { data: session, error: sessionError } =
        await adminSupabase.auth.verifyOtp({
          token_hash: token,
          type: "magiclink",
        });

      if (!sessionError && session?.session) {
        // Set cookies server-side
        const supabase = await createClient();
        await supabase.auth.setSession({
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token,
        });

        return NextResponse.json({
          success: true,
          message: "Login successful",
          session: {
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
          },
          redirectTo: "/client/dashboard",
        });
      }
    }

    // Fallback: return the magic link URL
    return NextResponse.json({
      success: true,
      message: "Login successful",
      authUrl: magicLinkData.properties.action_link,
      redirectTo: "/client/dashboard",
    });
  } catch (error) {
    console.error("Simple login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during login",
      },
      { status: 500 },
    );
  }
}
