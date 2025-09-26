import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    console.log("Creating organization with name:", name);
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create a service role client to bypass RLS first
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
              cookiesToSet.forEach(({ name: cookieName, value, options }) =>
                cookieStore.set(cookieName, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // Check if user already has an organization using service client
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
      return NextResponse.json({
        success: true,
        organization: existingOrg,
        message: "You already have an organization",
      });
    }

    // Create organization using service role client (already created above)
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .insert({
        name: name || "My Gym",
        subscription_status: "trialing",
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organization creation error - Full details:");
      console.error("Message:", orgError.message);
      console.error("Code:", orgError.code);
      console.error("Details:", orgError.details);
      console.error("Hint:", orgError.hint);
      console.error("Full error:", JSON.stringify(orgError, null, 2));

      return NextResponse.json(
        {
          error: "Failed to create organization",
          details: {
            message: orgError.message || "Unknown error",
            code: orgError.code,
            hint: orgError.hint,
          },
        },
        { status: 500 },
      );
    }

    // Link user to organization using service client
    const { error: linkError } = await serviceClient
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: "owner",
      });

    if (linkError) {
      console.error("Link user to org error:", linkError);
    }

    return NextResponse.json({
      success: true,
      organization: org,
      message: "Organization created successfully",
    });
  } catch (error: any) {
    console.error("Create organization error:", error);
    return NextResponse.json(
      { error: "Failed to create organization", details: error.message },
      { status: 500 },
    );
  }
}
