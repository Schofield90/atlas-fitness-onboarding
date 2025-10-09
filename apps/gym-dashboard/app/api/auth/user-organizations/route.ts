import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/user-organizations
 *
 * Returns all organizations that the authenticated user has access to.
 * Used for organization switcher dropdown.
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     organizations: [
 *       { id: string, name: string, role: string, source: string }
 *     ]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient();

    // Check if user is a super admin (can access ALL organizations)
    const isSuperAdmin =
      user.email?.endsWith("@gymleadhub.co.uk") ||
      user.email?.endsWith("@atlas-gyms.co.uk");

    if (isSuperAdmin) {
      // Super admin: return ALL organizations for support/debugging
      const { data: allOrgs } = await admin
        .from("organizations")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (allOrgs) {
        const organizations = allOrgs.map((org) => ({
          id: org.id,
          name: org.name,
          role: "superadmin",
          source: "superadmin",
          created_at: org.created_at,
        }));

        return NextResponse.json({
          success: true,
          data: {
            organizations,
            total: organizations.length,
            superadmin: true,
          },
        });
      }
    }

    // Collect all organizations from different sources
    const organizationsMap = new Map<string, any>();

    // 1. Check if user owns any organizations
    const { data: ownedOrgs } = await admin
      .from("organizations")
      .select("id, name")
      .eq("owner_id", user.id);

    if (ownedOrgs) {
      ownedOrgs.forEach((org) => {
        organizationsMap.set(org.id, {
          id: org.id,
          name: org.name,
          role: "owner",
          source: "owner",
        });
      });
    }

    // 2. Check user_organizations table
    const { data: userOrgs } = await admin
      .from("user_organizations")
      .select(
        `
        organization_id,
        role,
        created_at,
        organizations (id, name)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (userOrgs) {
      userOrgs.forEach((link: any) => {
        if (link.organizations) {
          // Don't overwrite owner role with lesser role
          if (!organizationsMap.has(link.organization_id)) {
            organizationsMap.set(link.organization_id, {
              id: link.organizations.id,
              name: link.organizations.name,
              role: link.role,
              source: "user_organizations",
              created_at: link.created_at,
            });
          }
        }
      });
    }

    // 3. Check organization_staff table
    const { data: staffLinks } = await admin
      .from("organization_staff")
      .select(
        `
        organization_id,
        role,
        created_at,
        organizations (id, name)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (staffLinks) {
      staffLinks.forEach((link: any) => {
        if (link.organizations) {
          // Don't overwrite owner or admin roles
          if (!organizationsMap.has(link.organization_id)) {
            organizationsMap.set(link.organization_id, {
              id: link.organizations.id,
              name: link.organizations.name,
              role: link.role || "staff",
              source: "organization_staff",
              created_at: link.created_at,
            });
          }
        }
      });
    }

    // Convert map to array and sort by creation date (most recent first)
    const organizations = Array.from(organizationsMap.values()).sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        organizations,
        total: organizations.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user organizations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch organizations",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
