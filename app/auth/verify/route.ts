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

    // Instead of setting cookies server-side, return a client-side redirect page
    // that will establish the session properly
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Completing login...</title>
  <style>
    body { 
      font-family: system-ui; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0;
      background: #1f2937;
      color: white;
    }
    .loading { text-align: center; }
    .spinner {
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid #f97316;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <div>Completing your login...</div>
  </div>
  <script>
    (async function() {
      try {
        // Import Supabase client
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        
        // Create Supabase client
        const supabase = createClient(
          '${process.env.NEXT_PUBLIC_SUPABASE_URL}',
          '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}'
        );
        
        // Set the session
        const { data, error } = await supabase.auth.setSession({
          access_token: '${session.session.access_token}',
          refresh_token: '${session.session.refresh_token}'
        });
        
        if (error) {
          console.error('Failed to set session:', error);
          window.location.href = '/simple-login?error=session_failed';
        } else {
          console.log('Session established successfully');
          // Redirect to the dashboard
          window.location.href = '${sessionToken.redirect_url}';
        }
      } catch (err) {
        console.error('Error during login:', err);
        window.location.href = '/simple-login?error=unexpected';
      }
    })();
  </script>
</body>
</html>
    `;

    console.log("Sending client-side session establishment page:", {
      user_id: session.session.user.id,
      email: sessionToken.email,
      organization_id: sessionToken.organization_id,
      redirect: sessionToken.redirect_url,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      new URL("/simple-login?error=verification_failed", request.url),
    );
  }
}
