import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Disconnecting Facebook integration");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Deactivate Facebook integration in database
    const { error: deleteError } = await supabase
      .from("facebook_integrations")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Database error disconnecting Facebook integration:",
        deleteError,
      );
      return NextResponse.json(
        { error: "Failed to disconnect", details: deleteError.message },
        { status: 500 },
      );
    }

    // Clear the Facebook token cookie
    const cookieStore = await cookies();
    cookieStore.delete("fb_token_data");

    console.log("✅ Facebook integration disconnected successfully");

    return NextResponse.json({
      success: true,
      message: "Facebook integration disconnected successfully",
      user_id: user.id,
      organization_id: organizationId,
    });
  } catch (error) {
    console.error("❌ Error disconnecting Facebook:", error);

    return NextResponse.json(
      {
        error: "Failed to disconnect Facebook integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
