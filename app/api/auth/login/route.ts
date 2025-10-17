import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const supabase = await createClient();

    // Sign in the user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 401 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 },
      );
    }

    // Ensure session is properly set in server cookies
    if (authData.session) {
      const cookieStore = await cookies();

      // Set auth cookies with proper security settings
      const isProd =
        process.env.NODE_ENV === "production" ||
        process.env.VERCEL_ENV === "production" ||
        request.headers.get("host")?.includes("vercel.app");

      cookieStore.set("sb-access-token", authData.session.access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: authData.session.expires_in || 3600,
        path: "/",
      });

      cookieStore.set("sb-refresh-token", authData.session.refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    // Wait a moment for auth to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get user's organizations with better error handling
    let organizations = [];
    try {
      // Use service role to check user organizations
      const serviceSupabase = createServiceRoleClient();

      const { data: userOrgs, error: orgError } = await serviceSupabase
        .from("user_organizations")
        .select(
          `
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            settings
          )
        `,
        )
        .eq("user_id", authData.user.id);

      if (orgError) {
        console.error("Organization fetch error:", orgError);
      } else {
        organizations = userOrgs || [];
      }

      // For admin users, create default organization if none exists
      if (organizations.length === 0 && email === "sam@atlas-gyms.co.uk") {
        console.log("Admin user detected, ensuring organization exists...");

        // Check if organization exists
        const { data: existingOrg } = await serviceSupabase
          .from("organizations")
          .select("*")
          .eq("email", email)
          .single();

        let orgId = existingOrg?.id;

        if (!existingOrg) {
          // Create organization
          const { data: newOrg, error: createOrgError } = await serviceSupabase
            .from("organizations")
            .insert({
              name: "Atlas Gyms",
              slug: "atlas-gyms-" + Date.now(),
              email: email,
              owner_id: authData.user.id,
              settings: {},
            })
            .select()
            .single();

          if (createOrgError) {
            console.error("Failed to create organization:", createOrgError);
          } else {
            orgId = newOrg.id;
          }
        }

        if (orgId) {
          // Ensure user-organization relationship
          await serviceSupabase.from("user_organizations").upsert(
            {
              user_id: authData.user.id,
              organization_id: orgId,
              role: "admin",
            },
            {
              onConflict: "user_id,organization_id",
            },
          );

          // Try fetching organizations again
          const { data: refreshedOrgs } = await serviceSupabase
            .from("user_organizations")
            .select(
              `
              organization_id,
              role,
              organizations (
                id,
                name,
                slug,
                settings
              )
            `,
            )
            .eq("user_id", authData.user.id);

          organizations = refreshedOrgs || [];
        }
      }
    } catch (orgError) {
      console.error("Organization setup error:", orgError);
    }

    if (organizations.length === 0) {
      console.error("No organizations found for user:", authData.user.email);
      return NextResponse.json(
        {
          success: false,
          error: "No organization found for this user. Please contact support.",
        },
        { status: 403 },
      );
    }

    // Get the first organization (or implement organization selection)
    const primaryOrg = organizations[0];

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: primaryOrg.role,
        },
        organization: primaryOrg.organizations,
        session: authData.session,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to create service role client
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const {
    createClient: createSupabaseClient,
  } = require("@supabase/supabase-js");

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
