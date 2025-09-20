import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: authError?.message,
        },
        { status: 401 },
      );
    }

    // Check users table - don't use .single() to avoid error if not found
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id);

    // Check organizations
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("*");

    // Check if user exists and has organization_id
    const userRecord = userData && userData.length > 0 ? userData[0] : null;
    const hasOrgId = userRecord?.organization_id ? true : false;

    // Also try to run requireAuth to see what error it gives
    let authCheckError = null;
    try {
      const { requireAuth } = await import("@/app/lib/api/auth-check");
      const authUser = await requireAuth();
      console.log("RequireAuth succeeded:", authUser);
    } catch (err) {
      authCheckError =
        err instanceof Error ? err.message : "Unknown auth error";
    }

    return NextResponse.json({
      success: true,
      authUser: {
        id: user.id,
        email: user.email,
        hasOrganizationId: hasOrgId,
      },
      userData: userRecord,
      userDataCount: userData?.length || 0,
      organizations: organizations || [],
      authCheckError,
      errors: {
        userError: userError?.message,
        orgError: orgError?.message,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check user organization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
