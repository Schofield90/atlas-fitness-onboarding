import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Check if nutrition_profiles table is accessible
    const { data: profiles, error: profileError } = await supabase
      .from("nutrition_profiles")
      .select("id, organization_id, client_id, created_at")
      .limit(5);

    // Test 2: Check organization_staff
    const { data: staff, error: staffError } = await supabase
      .from("organization_staff")
      .select("id, organization_id, role")
      .limit(5);

    // Test 3: Try to get count of profiles
    const { count, error: countError } = await supabase
      .from("nutrition_profiles")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      tests: {
        nutrition_profiles: {
          accessible: !profileError,
          error: profileError?.message || null,
          rowCount: profiles?.length || 0,
        },
        organization_staff: {
          accessible: !staffError,
          error: staffError?.message || null,
          rowCount: staff?.length || 0,
        },
        total_profiles: count || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
