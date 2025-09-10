import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== "sam@atlas-gyms.co.uk") {
      return NextResponse.json(
        { error: "This endpoint is only for Sam's account setup" },
        { status: 403 },
      );
    }

    console.log("Linking Sam's account to existing Atlas Fitness...");

    // Find the existing Atlas Fitness organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("name", "Atlas Fitness")
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Atlas Fitness organization not found" },
        { status: 404 },
      );
    }

    console.log("Found Atlas Fitness organization:", organization.id);

    // Link Sam as organization staff (owner role)
    const { error: staffError } = await supabase
      .from("organization_staff")
      .upsert(
        {
          organization_id: organization.id,
          user_id: user.id,
          role: "owner",
          permissions: ["all"],
          is_active: true,
        },
        {
          onConflict: "organization_id,user_id",
        },
      );

    if (staffError) {
      console.error("Error linking as staff:", staffError);
    } else {
      console.log("Linked Sam as owner of Atlas Fitness");
    }

    // Update the organization owner if needed
    await supabase
      .from("organizations")
      .update({ owner_id: user.id })
      .eq("id", organization.id);

    // Find Sam's existing client profile
    const { data: clientProfile } = await supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organization.id)
      .or(`email.eq.sam@atlas-gyms.co.uk,email.eq.Sam@atlas-gyms.co.uk`)
      .single();

    if (clientProfile) {
      console.log("Found existing client profile:", clientProfile.id);

      // Link the client profile to the user account
      await supabase
        .from("clients")
        .update({ user_id: user.id })
        .eq("id", clientProfile.id);

      console.log("Linked client profile to user account");
    } else {
      console.log("No existing client profile found for Sam");
    }

    // Update user metadata to set current organization and skip onboarding
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        current_organization_id: organization.id,
        organization_name: "Atlas Fitness",
        organization_role: "owner",
        onboarding_completed: true,
      },
    });

    if (updateError) {
      console.error("Error updating user metadata:", updateError);
    } else {
      console.log("Updated user metadata with organization info");
    }

    // Get some stats about the existing data
    const { data: classes } = await supabase
      .from("class_schedules")
      .select("id")
      .eq("organization_id", organization.id);

    const { data: memberships } = await supabase
      .from("customer_memberships")
      .select("id")
      .eq("organization_id", organization.id);

    const { data: bookings } = await supabase
      .from("class_bookings")
      .select("id")
      .eq("customer_id", clientProfile?.id);

    return NextResponse.json({
      success: true,
      message: "Successfully linked to Atlas Fitness!",
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        clientId: clientProfile?.id,
        stats: {
          classes: classes?.length || 0,
          memberships: memberships?.length || 0,
          userBookings: bookings?.length || 0,
        },
      },
      redirectTo: "/dashboard",
    });
  } catch (error: any) {
    console.error("Error linking account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to link account" },
      { status: 500 },
    );
  }
}
