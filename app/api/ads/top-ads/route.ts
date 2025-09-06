import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get current user and organization
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");
    const days = parseInt(searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "5");
    const metric = searchParams.get("metric") || "ctr"; // ctr, leads, roas, spend

    if (!accountId) {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 },
      );
    }

    // Call the database function to get top performing ads
    const { data: topAds, error } = await supabase.rpc(
      "get_top_performing_ads",
      {
        p_organization_id: user.organization_id,
        p_limit: limit,
        p_metric: metric,
        p_days: days,
      },
    );

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch top ads" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ads: topAds || [],
    });
  } catch (error) {
    console.error("Error fetching top ads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
