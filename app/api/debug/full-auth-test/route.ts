import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const supabase = createClient();

    // 1. Check auth user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 2. Get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // 3. Check cookies
    const cookieStore = await cookies();
    const authCookies = {
      "sb-access-token":
        cookieStore.get("sb-access-token")?.value?.substring(0, 20) + "...",
      "sb-refresh-token":
        cookieStore.get("sb-refresh-token")?.value?.substring(0, 20) + "...",
    };

    // 4. Try direct query to users table
    let userData = null;
    let userError = null;
    if (user) {
      const result = await supabase.from("users").select("*").eq("id", user.id);
      userData = result.data;
      userError = result.error;
    }

    // 5. Check organizations
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("*");

    // 6. Try to create a test lead to see exact error
    let leadTestResult = null;
    if (user && userData && userData[0]?.organization_id) {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: "Test Lead Debug",
          email: "test@debug.com",
          phone: "+1234567890",
          source: "manual",
          status: "new",
          organization_id: userData[0].organization_id,
          created_by: user.id,
          assigned_to: user.id,
        })
        .select();

      leadTestResult = { data, error };
    }

    // 7. Check RLS policies
    let rlsCheck = null;
    if (user) {
      // Try to query leads to see if RLS allows it
      const { data, error } = await supabase.from("leads").select("*").limit(1);

      rlsCheck = {
        canReadLeads: !error,
        error: error?.message,
      };
    }

    return NextResponse.json({
      authUser: user
        ? {
            id: user.id,
            email: user.email,
            aud: user.aud,
            role: user.role,
          }
        : null,
      authError: authError?.message,
      session: session
        ? {
            hasSession: true,
            userId: session.user?.id,
            expiresAt: session.expires_at,
          }
        : null,
      sessionError: sessionError?.message,
      cookies: authCookies,
      userData,
      userError: userError?.message,
      userCount: userData?.length || 0,
      organizations: orgs?.map((o) => ({ id: o.id, name: o.name })),
      orgsError: orgsError?.message,
      leadTestResult,
      rlsCheck,
      debug: {
        hasAuthUser: !!user,
        hasUserInTable: !!(userData && userData.length > 0),
        hasOrganizationId: !!(userData && userData[0]?.organization_id),
        organizationId: userData?.[0]?.organization_id || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
