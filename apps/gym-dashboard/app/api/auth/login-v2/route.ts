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

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 },
      );
    }

    // IMPORTANT: Set the auth cookies manually for localhost
    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === "production";

    // Set the Supabase auth cookies
    const cookieOptions = {
      path: "/",
      sameSite: "lax" as const,
      secure: isProduction,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set access token cookie
    cookieStore.set(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`,
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
        token_type: "bearer",
        user: authData.user,
      }),
      cookieOptions,
    );

    // Get user's organizations
    const { data: userOrgs } = await supabase
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

    const organizations = userOrgs || [];

    if (organizations.length === 0) {
      console.error("No organizations found for user:", authData.user.email);
      return NextResponse.json(
        { success: false, error: "No organization found for this user." },
        { status: 403 },
      );
    }

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
