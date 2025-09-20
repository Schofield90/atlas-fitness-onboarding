import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not logged in. Please login first at /login",
        },
        { status: 401 },
      );
    }

    // Check if user has organization
    const { data: userOrg } = await adminSupabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    let organizationId = userOrg?.organization_id;

    if (!organizationId) {
      // Create organization for user
      const { data: newOrg, error: createOrgError } = await adminSupabase
        .from("organizations")
        .insert({
          name: "Atlas Fitness",
          email: user.email,
          phone: "+447490253471",
          settings: {
            currency: "GBP",
            timezone: "Europe/London",
          },
        })
        .select()
        .single();

      if (createOrgError) {
        return NextResponse.json(
          {
            error: "Failed to create organization",
            details: createOrgError,
          },
          { status: 500 },
        );
      }

      organizationId = newOrg.id;

      // Link user to organization
      const { error: linkError } = await adminSupabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role: "owner",
        });

      if (linkError) {
        return NextResponse.json(
          {
            error: "Failed to link user to organization",
            details: linkError,
          },
          { status: 500 },
        );
      }
    }

    // Set up localStorage data for the frontend
    const trialData = {
      organizationName: "Atlas Fitness",
      gymName: "Atlas Fitness",
      email: user.email,
      trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Redirect to dashboard with setup complete
    const url = new URL(
      "/dashboard",
      process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
    );
    url.searchParams.set("setup", "complete");
    url.searchParams.set(
      "data",
      Buffer.from(JSON.stringify(trialData)).toString("base64"),
    );

    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
