import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Regular client (with RLS)
    const supabase = createClient();

    // Admin client (bypasses RLS)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get current auth user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Test 1: Query with regular client (RLS enabled)
    const { data: rlsData, error: rlsError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id);

    // Test 2: Query with admin client (RLS bypassed)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id);

    // Test 3: Get ALL users with admin to see what's there
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from("users")
      .select("id, email, organization_id, role")
      .order("created_at", { ascending: false })
      .limit(10);

    // Test 4: Check RLS policies on the table
    const { data: policies, error: policiesError } = await supabaseAdmin.rpc(
      "get_policies",
      { table_name: "users" },
    );

    // Test 5: Try different query approaches
    const { data: selectStarData } = await supabase
      .from("users")
      .select()
      .eq("id", user.id);

    const { data: singleData } = await supabase
      .from("users")
      .select()
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
      },
      rlsQuery: {
        found: !!(rlsData && rlsData.length > 0),
        count: rlsData?.length || 0,
        data: rlsData,
        error: rlsError?.message,
      },
      adminQuery: {
        found: !!(adminData && adminData.length > 0),
        count: adminData?.length || 0,
        data: adminData,
        error: adminError?.message,
      },
      allUsersViaAdmin: {
        count: allUsers?.length || 0,
        users: allUsers,
        error: allUsersError?.message,
      },
      policies: {
        data: policies,
        error: policiesError?.message,
      },
      alternativeQueries: {
        selectStar: {
          count: selectStarData?.length || 0,
          data: selectStarData,
        },
        single: { data: singleData },
      },
      diagnosis: {
        userExistsInDb: !!(adminData && adminData.length > 0),
        rlsBlockingAccess: !!(
          adminData &&
          adminData.length > 0 &&
          (!rlsData || rlsData.length === 0)
        ),
        recommendation: !!(
          adminData &&
          adminData.length > 0 &&
          (!rlsData || rlsData.length === 0)
        )
          ? "RLS policies are blocking access. Need to update RLS policies or use service role for queries."
          : "User may not exist in database.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "RLS test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
