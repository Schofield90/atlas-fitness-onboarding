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

    // Use Supabase middleware client to set the session properly
    const { createServerClient } = require("@supabase/ssr");
    const cookieStore = cookies();

    // Create a Supabase client that can properly set cookies
    const supabaseWithCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      },
    );

    // Set the session using the Supabase client which will handle cookies correctly
    await supabaseWithCookies.auth.setSession({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });

    // Create response with redirect after session is set
    const response = NextResponse.redirect(new URL(sessionToken.redirect_url));

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
