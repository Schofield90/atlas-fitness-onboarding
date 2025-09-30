import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Create service role client to bypass RLS and see all data
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

    const { data, error } = await supabase
      .from("membership_plans")
      .select("*")
      .order("organization_id", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all membership plans:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by organization for better visibility
    const groupedData = data?.reduce((acc: any, plan: any) => {
      const orgId = plan.organization_id;
      if (!acc[orgId]) {
        acc[orgId] = [];
      }
      acc[orgId].push(plan);
      return acc;
    }, {});

    return NextResponse.json({
      data: data || [],
      grouped: groupedData || {},
      total: data?.length || 0,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
