import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Helper function to check admin authorization
async function checkAdminAuth(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, error: "Not authenticated" };
  }

  const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
  if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
    return { authorized: false, error: "Not authorized for admin access" };
  }

  return { authorized: true, user };
}

// GET /api/saas-admin/organizations - List all organizations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const withSubscriptions =
      url.searchParams.get("with_subscriptions") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        email,
        phone,
        created_at
        ${
          withSubscriptions
            ? `,
        subscription:saas_subscriptions(
          id,
          status,
          billing_cycle,
          current_period_start,
          current_period_end,
          plan:saas_plans(id, name, tier)
        )`
            : ""
        }
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: organizations, error, count } = await query;

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 },
      );
    }

    // Transform data for easier consumption
    const transformedOrgs =
      organizations?.map((org) => ({
        ...org,
        subscription: Array.isArray(org.subscription)
          ? org.subscription[0]
          : org.subscription,
      })) || [];

    return NextResponse.json({
      organizations: transformedOrgs,
      total: count || 0,
    });
  } catch (error) {
    console.error(
      "Unexpected error in GET /api/saas-admin/organizations:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/saas-admin/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authCheck = await checkAdminAuth(supabase);

    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 },
      );
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .insert({
        name,
        email: email || null,
        phone: phone || null,
      })
      .select("id, name, email, phone, created_at")
      .single();

    if (error) {
      console.error("Error creating organization:", error);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        organization,
        message: "Organization created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Unexpected error in POST /api/saas-admin/organizations:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
