import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
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

    // Check if user already has an organization
    const { data: existingOrg } = await serviceClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (existingOrg?.organization_id) {
      return NextResponse.json({
        success: true,
        message: "User already has an organization",
        organizationId: existingOrg.organization_id,
      });
    }

    // Check if there's an organization owned by this user
    const { data: ownedOrg } = await serviceClient
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (ownedOrg) {
      // Link the user to their owned organization
      await serviceClient.from("user_organizations").insert({
        user_id: user.id,
        organization_id: ownedOrg.id,
        role: "owner",
      });

      return NextResponse.json({
        success: true,
        message: "Linked user to their existing organization",
        organizationId: ownedOrg.id,
      });
    }

    // Create a new organization for the user
    const { data: newOrg, error: orgError } = await serviceClient
      .from("organizations")
      .insert({
        name: "My Gym",
        owner_id: user.id,
        subscription_status: "trialing",
      })
      .select()
      .single();

    if (orgError) {
      console.error("Failed to create organization:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization", details: orgError },
        { status: 500 },
      );
    }

    // Link user to the new organization
    await serviceClient.from("user_organizations").insert({
      user_id: user.id,
      organization_id: newOrg.id,
      role: "owner",
    });

    return NextResponse.json({
      success: true,
      message: "Created new organization for user",
      organizationId: newOrg.id,
    });
  } catch (error: any) {
    console.error("Fix user org error:", error);
    return NextResponse.json(
      { error: "Failed to fix user organization", details: error.message },
      { status: 500 },
    );
  }
}
