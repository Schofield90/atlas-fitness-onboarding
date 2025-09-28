import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const search = request.nextUrl.searchParams.get("search");
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const pageSize = parseInt(
    request.nextUrl.searchParams.get("pageSize") || "10",
  );

  console.log("========== CLIENTS-BYPASS API DEBUG ==========");
  console.log("📍 organizationId requested:", organizationId);
  console.log("📍 search:", search);
  console.log("📍 page:", page);
  console.log("📍 pageSize:", pageSize);

  if (!organizationId) {
    console.log("❌ No organizationId provided");
    return NextResponse.json(
      { error: "Organization ID required" },
      { status: 400 },
    );
  }

  try {
    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    let query = supabase
      .from("clients")
      .select(
        `
        *,
        customer_memberships (
          membership_plan_id,
          status,
          start_date,
          end_date,
          membership_plans (
            id,
            name,
            price,
            price_pennies,
            billing_period
          )
        )
      `,
        { count: "exact" },
      )
      .eq("org_id", organizationId)
      .order("created_at", { ascending: false });

    // Add search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    // Add pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    console.log("📊 Query results:");
    console.log("  - Total count:", count);
    console.log("  - Data length:", data?.length);
    console.log(
      "  - First few clients:",
      data?.slice(0, 3).map((c) => ({
        id: c.id,
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        org_id: c.org_id,
        created_at: c.created_at,
      })),
    );

    if (error) {
      console.error("❌ Error fetching clients:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Returning", data?.length, "clients to frontend");
    console.log("==============================================");

    return NextResponse.json({ data, count });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
