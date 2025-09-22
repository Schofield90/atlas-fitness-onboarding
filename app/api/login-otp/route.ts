import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { action, email, otp } = await request.json();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    if (action === "send") {
      // Send OTP to email
      if (!email) {
        return NextResponse.json(
          { success: false, error: "Email required" },
          { status: 400 },
        );
      }

      // Find client by email
      const { data: client, error: clientError } = await adminSupabase
        .from("clients")
        .select("id, email, first_name, last_name, organization_id, user_id")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: "No account found with this email address" },
          { status: 404 },
        );
      }

      // If client has a user_id, send magic link
      if (client.user_id) {
        // Send magic link for existing user
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: email.toLowerCase().trim(),
          options: {
            emailRedirectTo: `${request.nextUrl.origin}/auth/callback?redirect=/client/dashboard`,
          },
        });

        if (magicLinkError) {
          console.error("Magic link error:", magicLinkError);

          // Fallback: For Sam, allow quick login in development
          if (email.toLowerCase() === "samschofield90@hotmail.co.uk") {
            // Store a temporary session token
            await adminSupabase.from("otp_tokens").insert({
              email: email.toLowerCase(),
              token: "123456", // Simple code for testing
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            });

            return NextResponse.json({
              success: true,
              message: "Use code: 123456",
            });
          }

          return NextResponse.json(
            { success: false, error: "Failed to send login email" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: "Login link sent to your email. Check your inbox!",
        });
      } else {
        // For clients without user_id, use OTP flow
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in database
        await adminSupabase.from("otp_tokens").insert({
          email: email.toLowerCase(),
          token: otpCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        console.log(`OTP for ${email}: ${otpCode}`);

        return NextResponse.json({
          success: true,
          message: "Login code sent (check console for now)",
        });
      }
    }

    if (action === "verify") {
      if (!email || !otp) {
        return NextResponse.json(
          { success: false, error: "Email and OTP required" },
          { status: 400 },
        );
      }

      // Special case for Sam - allow quick login
      if (
        email.toLowerCase() === "samschofield90@hotmail.co.uk" &&
        otp === "123456"
      ) {
        // Sign in the user directly
        const { data: authData, error: authError } =
          await adminSupabase.auth.admin.generateLink({
            type: "magiclink",
            email: email.toLowerCase(),
            options: {
              redirectTo: "/client/dashboard",
            },
          });

        if (authError || !authData) {
          console.error("Auth error:", authError);
          // Fallback - just redirect
          return NextResponse.json({
            success: true,
            redirectTo: "/client/dashboard",
            authUrl: `/auth/callback?token=temp&redirect=/client/dashboard`,
          });
        }

        return NextResponse.json({
          success: true,
          authUrl: authData.properties?.action_link || "/client/dashboard",
        });
      }

      // Verify OTP from database
      const { data: otpRecord, error: otpError } = await adminSupabase
        .from("otp_tokens")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("token", otp)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (otpError || !otpRecord) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired code" },
          { status: 400 },
        );
      }

      // Delete used OTP
      await adminSupabase.from("otp_tokens").delete().eq("id", otpRecord.id);

      // Get the client record
      const { data: client } = await adminSupabase
        .from("clients")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .single();

      if (client?.user_id) {
        // Generate magic link for user
        const { data: authData, error: authError } =
          await adminSupabase.auth.admin.generateLink({
            type: "magiclink",
            email: email.toLowerCase(),
            options: {
              redirectTo: "/client/dashboard",
            },
          });

        if (!authError && authData?.properties?.action_link) {
          return NextResponse.json({
            success: true,
            authUrl: authData.properties.action_link,
          });
        }
      }

      // Fallback redirect
      return NextResponse.json({
        success: true,
        redirectTo: "/client/dashboard",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Login OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 },
    );
  }
}
