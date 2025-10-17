import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user already has an organization
    const { data: existingLink } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (existingLink) {
      return NextResponse.json({
        success: true,
        organization_id: existingLink.organization_id,
        message: "Organization already exists",
      });
    }

    // Check if Atlas Fitness organization exists
    let { data: org } = await supabase
      .from("organizations")
      .select("*")
      .or("name.eq.Atlas Fitness,slug.eq.atlas-fitness")
      .single();

    if (!org) {
      // Create organization
      const { data: newOrg, error: createOrgError } = await supabase
        .from("organizations")
        .insert({
          name: "Atlas Fitness",
          owner_id: user.id,
          slug: "atlas-fitness",
          settings: {
            branding: {
              primaryColor: "#F97316",
              logo: null,
            },
            features: {
              messaging: true,
              automation: true,
              booking: true,
              ai_chat: true,
            },
          },
        })
        .select()
        .single();

      if (createOrgError) {
        console.error("Error creating organization:", createOrgError);
        return NextResponse.json(
          { error: "Failed to create organization" },
          { status: 500 },
        );
      }

      org = newOrg;
    }

    // Link user to organization
    const { error: linkError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: "owner",
      });

    if (linkError && !linkError.message.includes("duplicate")) {
      console.error("Error linking user to organization:", linkError);
      return NextResponse.json(
        { error: "Failed to link organization" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      organization_id: org.id,
      message: "Organization setup complete",
    });
  } catch (error) {
    console.error("Setup organization error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
