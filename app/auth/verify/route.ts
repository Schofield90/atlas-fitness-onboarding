import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      console.error("No token provided in verification URL");
      return NextResponse.redirect(
        new URL("/simple-login?error=missing_token", request.url),
      );
    }

    const adminSupabase = createAdminClient();

    // Verify token exists and hasn't expired
    const { data: sessionToken, error: tokenError } = await adminSupabase
      .from("session_tokens")
      .select("*, clients!inner(user_id, organization_id)")
      .eq("token", token)
      .gte("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single();

    if (tokenError || !sessionToken) {
      console.error("Invalid or expired token:", tokenError);
      return NextResponse.redirect(
        new URL("/simple-login?error=invalid_token", request.url),
      );
    }

    // Mark token as used
    await adminSupabase
      .from("session_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", sessionToken.id);

    // If user doesn't exist, create one
    let userId = sessionToken.user_id;
    if (!userId) {
      const { data: newUser, error: createError } =
        await adminSupabase.auth.admin.createUser({
          email: sessionToken.email,
          email_confirm: true,
          user_metadata: {
            organization_id: sessionToken.organization_id,
            role: "member",
          },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return NextResponse.redirect(
          new URL("/simple-login?error=user_creation_failed", request.url),
        );
      }

      userId = newUser.user.id;

      // Update client with user_id
      await adminSupabase
        .from("clients")
        .update({ user_id: userId })
        .eq("email", sessionToken.email)
        .eq("organization_id", sessionToken.organization_id);
    }

    // Generate a magic link for the user (but we'll extract the tokens)
    const { data: magicLink, error: magicLinkError } =
      await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email: sessionToken.email,
      });

    if (magicLinkError || !magicLink?.properties?.action_link) {
      console.error("Failed to generate magic link:", magicLinkError);
      return NextResponse.redirect(
        new URL("/simple-login?error=session_creation_failed", request.url),
      );
    }

    // Extract token from magic link
    const magicUrl = new URL(magicLink.properties.action_link);
    const magicToken = magicUrl.searchParams.get("token");
    const tokenType = magicUrl.searchParams.get("type");

    if (!magicToken) {
      console.error("No token in magic link");
      return NextResponse.redirect(
        new URL("/simple-login?error=token_extraction_failed", request.url),
      );
    }

    // Exchange token for session
    const { data: session, error: exchangeError } =
      await adminSupabase.auth.verifyOtp({
        token_hash: magicToken,
        type: (tokenType as any) || "magiclink",
      });

    if (exchangeError || !session?.session) {
      console.error("Token exchange failed:", exchangeError);
      return NextResponse.redirect(
        new URL("/simple-login?error=session_exchange_failed", request.url),
      );
    }

    // Clean up OTP tokens for this email
    await adminSupabase
      .from("otp_tokens")
      .delete()
      .eq("email", sessionToken.email.toLowerCase());

    // Create response with redirect
    const response = NextResponse.redirect(new URL(sessionToken.redirect_url));

    // Set session cookies
    const cookieStore = cookies();

    // Set access token
    cookieStore.set("sb-access-token", session.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Set refresh token
    cookieStore.set("sb-refresh-token", session.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    console.log("Session established successfully via custom token:", {
      user_id: session.session.user.id,
      email: sessionToken.email,
      organization_id: sessionToken.organization_id,
      redirect: sessionToken.redirect_url,
    });

    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      new URL("/simple-login?error=verification_failed", request.url),
    );
  }
}
