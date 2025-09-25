import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Create user record using service role to bypass RLS
    const { data: existingUser } = await serviceClient
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: userInsertError } = await serviceClient
        .from("users")
        .insert([
          {
            id: user.id,
            email: user.email || email,
            name: name || "Gym Owner",
          },
        ]);

      if (userInsertError && userInsertError.code !== "23505") {
        console.error("User insert error:", userInsertError);
        return NextResponse.json(
          {
            error: "Failed to create user record",
            details: userInsertError.message,
          },
          { status: 500 },
        );
      }
    }

    // Check if user already has an organization
    const { data: existingOrg } = await serviceClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let orgId = existingOrg?.organization_id;

    if (!orgId) {
      // Create organization
      const orgName = organizationName || "My Gym";
      const slug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data: newOrg, error: orgError } = await serviceClient
        .from("organizations")
        .insert([
          {
            name: orgName,
            slug: slug,
            email: user.email || email,
            phone: "",
            subscription_status: "trialing",
          },
        ])
        .select("id")
        .single();

      if (orgError) {
        console.error("Org creation error:", orgError);
        return NextResponse.json(
          {
            error: "Failed to create organization",
            details: orgError.message,
          },
          { status: 500 },
        );
      }

      orgId = newOrg.id;

      // Link user to organization
      const { error: linkError } = await serviceClient
        .from("user_organizations")
        .insert([
          {
            user_id: user.id,
            organization_id: orgId,
            role: "owner",
          },
        ]);

      if (linkError) {
        console.error("Link error:", linkError);
        return NextResponse.json(
          {
            error: "Failed to link user to organization",
            details: linkError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      organizationId: orgId,
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
