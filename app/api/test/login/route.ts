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

    // Use a different approach - try to sign up first, then sign in if already exists
    let session;
    let user;

    // First, try to sign in (in case user already exists)
    console.log(`Attempting to sign in user: ${email}`);
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password: password || "TestPassword123!",
      });

    if (signInData?.session) {
      // User exists and we signed in successfully
      session = signInData.session;
      user = signInData.user;
      console.log(`Successfully signed in existing user: ${email}`);

      // Update user metadata
      if (user) {
        await supabaseAdmin.auth.updateUser({
          data: {
            role,
            subdomain,
          },
        });
      }
    } else {
      // User doesn't exist or wrong password, try to create
      console.log(`Sign in failed, attempting to create user: ${email}`);

      // Use the regular auth.signUp method instead of admin API
      const { data: signUpData, error: signUpError } =
        await supabaseAdmin.auth.signUp({
          email,
          password: password || "TestPassword123!",
          options: {
            data: {
              role,
              subdomain,
            },
            // Skip email confirmation for test users
            emailRedirectTo: undefined,
          },
        });

      if (signUpError) {
        console.error("Sign up error:", signUpError);

        // If user already exists, try signing in with the provided password
        if (signUpError.message?.includes("already registered")) {
          const { data: retrySignIn, error: retryError } =
            await supabaseAdmin.auth.signInWithPassword({
              email,
              password: password || "TestPassword123!",
            });

          if (retryError) {
            return NextResponse.json(
              {
                error: "User exists but cannot sign in. Check password.",
                details: retryError.message,
              },
              { status: 401 },
            );
          }

          session = retrySignIn.session;
          user = retrySignIn.user;
        } else {
          return NextResponse.json(
            {
              error: "Failed to create test user",
              details: signUpError.message,
            },
            { status: 500 },
          );
        }
      } else if (signUpData?.session) {
        session = signUpData.session;
        user = signUpData.user;
        console.log(`Successfully created and signed in new user: ${email}`);
      } else {
        // User created but needs email confirmation (shouldn't happen in test)
        console.log(
          "User created but needs email confirmation, attempting direct sign in",
        );

        // Try to sign in directly
        const { data: directSignIn, error: directError } =
          await supabaseAdmin.auth.signInWithPassword({
            email,
            password: password || "TestPassword123!",
          });

        if (directError) {
          return NextResponse.json(
            {
              error: "User created but cannot sign in",
              details: "Email confirmation may be required",
            },
            { status: 500 },
          );
        }

        session = directSignIn.session;
        user = directSignIn.user;
      }
    }

    if (!session || !user) {
      return NextResponse.json(
        { error: "Failed to establish session" },
        { status: 500 },
      );
    }

    // Set cookies for the session
    const cookieStore = await cookies();
    const projectId = process.env.SUPABASE_PROJECT_ID || "lzlrojoaxrqvmhempnkn";

    // Cookie options for local development with subdomains
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      // Important: use leading dot for subdomain support in development
      domain:
        process.env.NODE_ENV === "production"
          ? ".gymleadhub.co.uk"
          : "localhost",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set Supabase auth cookies
    cookieStore.set(
      `sb-${projectId}-auth-token`,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
      }),
      cookieOptions,
    );

    // Also set a simplified cookie for easier debugging
    cookieStore.set(
      `test-auth-${subdomain}`,
      JSON.stringify({
        user_id: user.id,
        email: user.email,
        role,
        subdomain,
      }),
      cookieOptions,
    );

    // Handle organization setup for owners/coaches
    if (role === "owner" || role === "coach") {
      try {
        // Check if user has an organization
        const { data: existingOrg } = await supabaseAdmin
          .from("organizations")
          .select("id, name")
          .eq("owner_id", user.id)
          .single();

        if (!existingOrg) {
          // Create a test organization
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert({
              name: `Test Org for ${email}`,
              owner_id: user.id,
              subdomain: `test-${Date.now()}`,
              settings: {},
            })
            .select()
            .single();

          if (!orgError && newOrg) {
            console.log(`Created test organization: ${newOrg.name}`);

            // Add user to organization_staff
            await supabaseAdmin.from("organization_staff").insert({
              organization_id: newOrg.id,
              user_id: user.id,
              role: "owner",
              is_active: true,
            });
          }
        }
      } catch (orgError) {
        console.error("Organization setup error:", orgError);
        // Continue anyway - org setup is not critical for auth test
      }
    }

    // Handle client setup for members
    if (role === "member") {
      try {
        // Check if user is already a client
        const { data: existingClient } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!existingClient) {
          // Get Atlas Fitness organization
          const { data: atlasOrg } = await supabaseAdmin
            .from("organizations")
            .select("id")
            .eq("subdomain", "atlas-fitness")
            .single();

          if (atlasOrg) {
            // Create client record
            const { data: newClient } = await supabaseAdmin
              .from("clients")
              .insert({
                user_id: user.id,
                organization_id: atlasOrg.id,
                email: user.email,
                name: user.email?.split("@")[0] || "Test Member",
                phone: "+447000000000",
              })
              .select()
              .single();

            if (newClient) {
              console.log(`Created test client record for member`);
            }
          }
        }
      } catch (clientError) {
        console.error("Client setup error:", clientError);
        // Continue anyway - client setup is not critical for auth test
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
        access_token: session.access_token,
        expires_at: session.expires_at,
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
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    projectId: process.env.SUPABASE_PROJECT_ID || "lzlrojoaxrqvmhempnkn",
  });
}
