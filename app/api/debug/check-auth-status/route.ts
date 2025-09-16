import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return NextResponse.json(
        {
          error: "Session error",
          details: sessionError.message,
        },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: "No active session",
      });
    }

    // Get user details
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Check organization membership
    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id, role, is_active")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    // Check if user exists in users table
    const { data: userRecord, error: userRecordError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    // Try to fix organization membership if missing
    let fixAttempted = false;
    let fixResult = null;

    if (!orgMember && userRecord) {
      // User exists but no org membership - try to fix
      const hardcodedOrgId = "63589490-8f55-4157-bd3a-e141594b748e";

      const { data: fixData, error: fixError } = await supabase
        .from("organization_members")
        .upsert(
          {
            user_id: session.user.id,
            organization_id: hardcodedOrgId,
            role: "owner",
            is_active: true,
            joined_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,organization_id",
          },
        )
        .select()
        .single();

      fixAttempted = true;
      fixResult = fixError
        ? { error: fixError.message }
        : { success: true, data: fixData };
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        provider: session.user.app_metadata?.provider,
      },
      user: {
        exists: !!userRecord,
        id: userRecord?.id,
        email: userRecord?.email,
        fullName: userRecord?.full_name,
      },
      organization: {
        hasMembership: !!orgMember,
        organizationId: orgMember?.organization_id,
        role: orgMember?.role,
        isActive: orgMember?.is_active,
      },
      fix: {
        attempted: fixAttempted,
        result: fixResult,
      },
      debug: {
        orgError: orgError?.message,
        userRecordError: userRecordError?.message,
      },
    });
  } catch (error: any) {
    console.error("Auth status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check auth status",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
