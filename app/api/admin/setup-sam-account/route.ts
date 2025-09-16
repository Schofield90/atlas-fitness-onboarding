import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

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

    console.log("Setting up Sam's account with Atlas Fitness...");

    // Check if Atlas Fitness organization exists
    let { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("name", "Atlas Fitness")
      .single();

    let orgId;

    if (!organization) {
      // Create Atlas Fitness organization
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: "Atlas Fitness",
          type: "gym",
          industry: "fitness",
          size: "11-50",
          website: "https://atlas-fitness.com",
          description:
            "Premium fitness facility with state-of-the-art equipment and expert trainers",
          subscription_tier: "professional",
          subscription_status: "active",
          trial_ends_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          max_users: 10,
          max_clients: 1000,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        // If organization exists, try to get it
        const { data: existingOrg } = await supabase
          .from("organizations")
          .select("*")
          .eq("name", "Atlas Fitness")
          .single();

        if (existingOrg) {
          orgId = existingOrg.id;
          // Update owner
          await supabase
            .from("organizations")
            .update({ owner_id: user.id })
            .eq("id", orgId);
        } else {
          throw orgError;
        }
      } else {
        orgId = newOrg.id;
        console.log("Created Atlas Fitness organization:", orgId);
      }
    } else {
      orgId = organization.id;
      console.log("Found existing Atlas Fitness organization:", orgId);

      // Update owner if needed
      await supabase
        .from("organizations")
        .update({ owner_id: user.id })
        .eq("id", orgId);
    }

    // Add Sam as organization staff (owner role)
    const { error: staffError } = await supabase
      .from("organization_staff")
      .upsert(
        {
          organization_id: orgId,
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
      console.error("Error adding staff:", staffError);
    } else {
      console.log("Added Sam as owner of Atlas Fitness");
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        current_organization_id: orgId,
        organization_name: "Atlas Fitness",
        organization_role: "owner",
        onboarding_completed: true,
      },
    });

    if (updateError) {
      console.error("Error updating user metadata:", updateError);
    }

    // Check if Sam exists as a client (for testing client features)
    const { data: existingClient } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!existingClient) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          organization_id: orgId,
          first_name: "Sam",
          last_name: "Schofield",
          email: "sam@atlas-gyms.co.uk",
          phone: "+447490253471",
          status: "active",
          source: "direct",
        })
        .select()
        .single();

      if (clientError) {
        console.error("Error creating client:", clientError);
      } else {
        console.log("Created Sam as client:", newClient.id);
      }
    }

    // Add a location for Atlas Fitness
    const { error: locationError } = await supabase
      .from("organization_locations")
      .upsert(
        {
          organization_id: orgId,
          name: "Atlas Fitness Main",
          address: "123 High Street",
          city: "York",
          state: "Yorkshire",
          zip: "YO1 1AA",
          country: "UK",
          phone: "+441904123456",
          email: "york@atlas-fitness.com",
          is_primary: true,
        },
        {
          onConflict: "organization_id,name",
        },
      );

    if (locationError) {
      console.error("Error adding location:", locationError);
    }

    return NextResponse.json({
      success: true,
      message:
        "Account setup complete! You can now access the Atlas Fitness dashboard.",
      organizationId: orgId,
      redirectTo: "/dashboard",
    });
  } catch (error: any) {
    console.error("Error setting up account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set up account" },
      { status: 500 },
    );
  }
}
