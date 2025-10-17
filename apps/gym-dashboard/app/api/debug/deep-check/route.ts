import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Get auth session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // 2. Get auth user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // 3. Direct query to users table
    let usersTableData = null;
    let usersTableError = null;
    if (user) {
      const result = await supabase.from("users").select("*").eq("id", user.id);
      usersTableData = result.data;
      usersTableError = result.error;
    }

    // 4. Try requireAuth function
    let requireAuthResult = null;
    let requireAuthError = null;
    try {
      const { requireAuth } = await import("@/app/lib/api/auth-check");
      requireAuthResult = await requireAuth();
    } catch (err) {
      requireAuthError = err instanceof Error ? err.message : String(err);
    }

    // 5. Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter((c) => c.name.includes("sb-"));

    // 6. Test a direct lead insert (without going through requireAuth)
    let directLeadTest = null;
    if (user && usersTableData && usersTableData[0]?.organization_id) {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: "Debug Test Lead",
          email: "debug@test.com",
          phone: "+1234567890",
          source: "manual",
          status: "new",
          organization_id: usersTableData[0].organization_id,
          created_by: user.id,
          assigned_to: user.id,
        })
        .select();

      directLeadTest = { success: !error, data, error: error?.message };
    }

    // 7. Check the actual error when calling the leads API
    let apiCallTest = null;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieStore.toString(),
          },
          body: JSON.stringify({
            name: "API Test Lead",
            email: "apitest@test.com",
            phone: "+1234567890",
            source: "manual",
          }),
        },
      );

      const result = await response.text();
      let data;
      try {
        data = JSON.parse(result);
      } catch {
        data = result;
      }

      apiCallTest = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
      };
    } catch (err) {
      apiCallTest = { error: err instanceof Error ? err.message : String(err) };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        sessionError: sessionError?.message,
        userError: userError?.message,
      },
      usersTable: {
        found: !!(usersTableData && usersTableData.length > 0),
        count: usersTableData?.length || 0,
        data: usersTableData,
        error: usersTableError?.message,
      },
      requireAuth: {
        success: !!requireAuthResult,
        result: requireAuthResult,
        error: requireAuthError,
      },
      cookies: {
        total: allCookies.length,
        supabaseCount: supabaseCookies.length,
        names: supabaseCookies.map((c) => c.name),
      },
      directLeadTest,
      apiCallTest,
      debug: {
        userInUsersTable: usersTableData?.[0],
        organizationId: usersTableData?.[0]?.organization_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Deep check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
