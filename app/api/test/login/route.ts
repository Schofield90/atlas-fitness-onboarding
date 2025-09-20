import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// This route is ONLY for E2E testing - must be protected
export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_LOGIN !== "true"
  ) {
    return NextResponse.json(
      { error: "Test login not allowed in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { email, role, subdomain, password } = body;

    if (!email || !role || !subdomain) {
      return NextResponse.json(
        { error: "Missing required fields: email, role, subdomain" },
        { status: 400 },
      );
    }

    // Create admin client with service role key for test purposes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Check if user exists, create if not
    let user;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (!existingUser) {
      // Create user with password
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || "TestPassword123!",
          email_confirm: true,
          user_metadata: {
            role,
            subdomain,
          },
        });

      if (createError) {
        console.error("Error creating test user:", createError);
        return NextResponse.json(
          { error: "Failed to create test user", details: createError.message },
          { status: 500 },
        );
      }
      user = newUser.user;
    } else {
      // Update existing user's metadata
      const { data: updatedUser, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            role,
            subdomain,
          },
        });

      if (updateError) {
        console.error("Error updating test user:", updateError);
        return NextResponse.json(
          { error: "Failed to update test user", details: updateError.message },
          { status: 500 },
        );
      }
      user = updatedUser.user;
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found or created" },
        { status: 404 },
      );
    }

    // Generate session token
    const { data: session, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
      });

    if (sessionError || !session) {
      console.error("Error generating session:", sessionError);
      return NextResponse.json(
        { error: "Failed to generate session", details: sessionError?.message },
        { status: 500 },
      );
    }

    // Sign in the user programmatically
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password: password || "TestPassword123!",
      });

    if (signInError || !signInData.session) {
      console.error("Error signing in:", signInError);
      return NextResponse.json(
        { error: "Failed to sign in", details: signInError?.message },
        { status: 500 },
      );
    }

    // Set cookies for the session
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      domain: `.localhost`, // Allow subdomain access
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set Supabase auth cookies
    cookieStore.set(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || "lzlrojoaxrqvmhempnkn"}-auth-token`,
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        expires_in: signInData.session.expires_in,
        token_type: signInData.session.token_type,
      }),
      cookieOptions,
    );

    // Also set organization data if needed
    if (role === "owner" || role === "coach") {
      // Get or create organization for this test user
      const { data: orgs } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (orgs) {
        cookieStore.set("test-organization-id", orgs.id, cookieOptions);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role,
        subdomain,
      },
      session: {
        access_token: signInData.session.access_token,
        expires_at: signInData.session.expires_at,
      },
    });
  } catch (error) {
    console.error("Test login error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check if test login is enabled
export async function GET() {
  const isEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_TEST_LOGIN === "true";

  return NextResponse.json({
    enabled: isEnabled,
    environment: process.env.NODE_ENV,
  });
}
