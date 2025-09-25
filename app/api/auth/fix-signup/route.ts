import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, name, organizationName } = await request.json();
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create a service role client to bypass RLS
    const cookieStore = await cookies();
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // First check if user already exists
    const { data: existingUser } = await serviceClient
      .from("users")
      .select()
      .eq("id", user.id)
      .single();

    let userData = existingUser;
    let userError = null;

    // Only create if doesn't exist
    if (!existingUser) {
      const { data, error } = await serviceClient
        .from("users")
        .insert({
          id: user.id,
          email: user.email || email,
        })
        .select()
        .single();

      userData = data;
      userError = error;
    }

    if (userError) {
      console.error("User creation error:", userError);
      return NextResponse.json(
        {
          error: "Failed to create user record",
          details: userError,
        },
        { status: 500 },
      );
    }

    // Always create organization (use provided name or default)
    const orgName = organizationName || "My Gym";

    // Check if user already has an organization
    const { data: existingUserOrg } = await serviceClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!existingUserOrg) {
      // Check if there's already an organization linked to this user as owner
      const { data: existingOrgLink } = await serviceClient
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .single();

      const existingOrg = existingOrgLink
        ? { id: existingOrgLink.organization_id }
        : null;

      if (existingOrg) {
        // Link to existing organization
        const { error: linkError } = await serviceClient
          .from("user_organizations")
          .insert({
            user_id: user.id,
            organization_id: existingOrg.id,
            role: "owner",
          });

        if (linkError) {
          console.error(
            "Failed to link user to existing organization:",
            linkError,
          );
        }
      } else {
        // Create new organization
        const { data: org, error: orgError } = await serviceClient
          .from("organizations")
          .insert({
            name: orgName,
            subscription_status: "trialing",
          })
          .select()
          .single();

        if (orgError) {
          console.error("Failed to create organization:", orgError);
          return NextResponse.json(
            {
              error: "Failed to create organization",
              details: orgError.message,
            },
            { status: 500 },
          );
        }

        // Link user to organization
        const { error: linkError } = await serviceClient
          .from("user_organizations")
          .insert({
            user_id: user.id,
            organization_id: org.id,
            role: "owner",
          });

        if (linkError) {
          console.error("Failed to link user to organization:", linkError);
          return NextResponse.json(
            {
              error: "Failed to link user to organization",
              details: linkError.message,
            },
            { status: 500 },
          );
        }

        console.log(`Created organization "${orgName}" for user ${user.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "User setup completed",
    });
  } catch (error: any) {
    console.error("Fix signup error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix signup",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
