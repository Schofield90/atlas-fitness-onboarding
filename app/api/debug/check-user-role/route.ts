import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check user's organization and role
    const { data: userOrgs, error: orgError } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("user_id", user.id);

    // Check if RLS is enabled on tables
    const { data: classSessions } = await supabase
      .from("class_sessions")
      .select("*")
      .limit(1);

    const { data: programs } = await supabase
      .from("programs")
      .select("*")
      .limit(1);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      organizations: userOrgs || [],
      canAccessClassSessions: !!classSessions,
      canAccessPrograms: !!programs,
      debug: {
        userOrgsError: orgError?.message,
        hasOrganizations: (userOrgs?.length || 0) > 0,
        roles: userOrgs?.map((org) => ({
          org_id: org.organization_id,
          role: org.role,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check user role",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
