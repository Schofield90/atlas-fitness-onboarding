import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { otpRecordId } = await request.json();

    if (!otpRecordId) {
      return NextResponse.json(
        { success: false, error: "No OTP record ID provided" },
        { status: 400 },
      );
    }

    // Verify the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("Session confirmation failed - no authenticated user");
      return NextResponse.json(
        { success: false, error: "Session not established" },
        { status: 401 },
      );
    }

    // Session is confirmed, now delete the OTP
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from("otp_tokens")
      .delete()
      .eq("id", otpRecordId);

    if (deleteError) {
      console.error("Error deleting OTP after confirmation:", deleteError);
      // Don't fail the request, OTP will expire naturally
    } else {
      console.log("OTP deleted after successful session confirmation");
    }

    return NextResponse.json({
      success: true,
      message: "Session confirmed",
      userId: user.id,
    });
  } catch (error) {
    console.error("Session confirmation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm session" },
      { status: 500 },
    );
  }
}
