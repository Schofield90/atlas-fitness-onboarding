import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import {
  checkAuthRateLimit,
  createRateLimitResponse,
} from "@/app/lib/rate-limit";

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

    const normalizedEmail = email.toLowerCase().trim();

    // First, try to sign in with Supabase Auth directly
    // This will work for members who have claimed their accounts
    const supabase = await createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

    if (!authError && authData?.user && authData?.session) {
      // Successful login!
      console.log("Member logged in successfully:", normalizedEmail);

      return NextResponse.json({
        success: true,
        message: "Login successful",
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        },
        redirectTo: "/client/dashboard",
      });
    }

    // If auth failed, check if this is because the account doesn't exist
    // or if it's just a wrong password
    const adminSupabase = createAdminClient();

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
        first_name,
        last_name,
        organization_id,
        user_id,
        metadata
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

    // Check if client has been properly set up
    if (!client.user_id) {
      // Check if they have a claim token in metadata
      if (client.metadata?.claim_token) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Please use your invitation link to set up your password first.",
            needsSetup: true,
            invitationToken: client.metadata.claim_token,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "No account found. Please contact your gym for an invitation.",
        },
        { status: 404 },
      );
    }

    // If we get here, the user exists but password was wrong
    if (authError?.message?.includes("Invalid login credentials")) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Some other error occurred
    console.error("Login error:", authError);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during login. Please try again.",
      },
      { status: 500 },
    );
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
