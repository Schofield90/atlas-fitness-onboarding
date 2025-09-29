import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Starting get-organization API request...");

    // Get the authenticated user from the session client
    const supabase = await createClient();
    let {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("❌ No authenticated user found:", userError?.message);

      // Try to get session as fallback before failing
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session || !session.user) {
        console.log("❌ No session found either, user needs to re-login");
        return NextResponse.json(
          { success: false, error: "Session expired", requiresReauth: true },
          { status: 401 },
        );
      }

      // Use session user if direct getUser failed
      user = session.user;
      console.log("✅ Recovered user from session:", user.id);
    }

    console.log("✅ Authenticated user found:", user.id, user.email);

    // Use admin client to bypass RLS policies
    const admin = createAdminClient();

    // First, check if user has an organization before assuming they're a superadmin
    // This ensures users like sam@atlas-gyms.co.uk who have organizations can access them
    let hasOrganization = false;

    // Check user_organizations table first
    console.log("Checking if user has an organization...");
    const { data: checkUserOrg } = await admin
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (checkUserOrg && checkUserOrg.length > 0) {
      hasOrganization = true;
      console.log(
        "✅ Found organization in user_organizations:",
        checkUserOrg[0].organization_id,
      );
    } else {
      // Check if they own an organization
      const { data: checkOwnedOrg } = await admin
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      if (checkOwnedOrg && checkOwnedOrg.length > 0) {
        hasOrganization = true;
        console.log("✅ Found organization by owner_id:", checkOwnedOrg[0].id);
      }
    }

    // Only treat as superadmin if they have no organization
    if (
      !hasOrganization &&
      (user.email?.endsWith("@gymleadhub.co.uk") ||
        user.email?.endsWith("@atlas-gyms.co.uk"))
    ) {
      console.log("User is a platform admin without organization");
      return NextResponse.json({
        success: true,
        data: {
          organizationId: null,
          organization: null,
          user: user,
          role: "superadmin",
        },
      });
    }

    // Check if user is a client (not an organization owner)
    const { data: clientCheck } = await admin
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientCheck) {
      console.log("User is a client/member - no organization needed");
      return NextResponse.json({
        success: true,
        data: {
          organizationId: null,
          organization: null,
          user: user,
          role: "client",
        },
      });
    }

    // First, try to find organization where user is the owner
    console.log("Checking organizations table for owner_id:", user.id);
    const { data: ownedOrg, error: ownedOrgError } = await admin
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    let orgId: string | null = null;
    let userRole: string = "member";

    if (ownedOrg) {
      orgId = ownedOrg.id;
      userRole = "owner";
      console.log("✅ Found organization by owner_id:", ownedOrg);
    } else if (ownedOrgError) {
      console.log("❌ organizations query error:", ownedOrgError);
    }

    // If not an owner, try to get organization via user_organizations table
    if (!orgId) {
      console.log("Checking user_organizations for user:", user.id);
      const { data: userOrgData, error: userOrgError } = await admin
        .from("user_organizations")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1); // Use limit instead of single to handle multiple records

      if (userOrgData && userOrgData.length > 0) {
        console.log(
          "✅ Found organization via user_organizations:",
          userOrgData[0],
        );
        orgId = userOrgData[0].organization_id;
        userRole = userOrgData[0].role;
      } else if (userOrgError) {
        console.log("❌ user_organizations query error:", userOrgError);
      }
    }

    if (!orgId) {
      console.log("No organization found for user");
      return NextResponse.json({
        success: true,
        data: {
          organizationId: null,
          organization: null,
          user: user,
          role: "none",
        },
      });
    }

    // Fetch organization details
    const { data: orgDetails, error: detailsError } = await admin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (detailsError) {
      console.error("Error fetching organization details:", detailsError);
      // Return basic data even if details fail
      return NextResponse.json({
        success: true,
        data: {
          organizationId: orgId,
          organization: { id: orgId, name: "Organization" },
          user: user,
          role: userRole,
        },
      });
    }

    console.log("✅ Successfully fetched organization data:", {
      organizationId: orgId,
      organizationName: orgDetails?.name,
      userRole,
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId: orgId,
        organization: orgDetails,
        user: user,
        role: userRole,
      },
    });
  } catch (error: any) {
    console.error("❌ Get organization API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch organization data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
