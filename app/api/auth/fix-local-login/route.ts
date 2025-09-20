import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user has organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrg?.organization_id) {
      // Set organization cookie
      const cookieStore = await cookies();
      cookieStore.set("organizationId", userOrg.organization_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      // Redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } else {
      return NextResponse.json({
        error: "No organization found",
        suggestion:
          "Run the SQL to link your user to Atlas Fitness organization",
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
