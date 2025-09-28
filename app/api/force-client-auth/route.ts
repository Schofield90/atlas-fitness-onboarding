import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Create a service role client to bypass auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Sign in as the client user directly with service role
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'samschofield90@hotmail.co.uk'
    });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      });
    }
    
    // Alternative: Create a session directly
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: "samschofield90@hotmail.co.uk",
      password: "@Aa80236661"
    });
    
    if (sessionError) {
      return NextResponse.json({ 
        success: false, 
        error: sessionError.message 
      });
    }
    
    // Clear all existing cookies first
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Delete each cookie
    allCookies.forEach(cookie => {
      cookieStore.delete(cookie.name);
    });
    
    // Set the new auth cookies
    if (sessionData.session) {
      // Set the auth cookies manually
      const accessToken = sessionData.session.access_token;
      const refreshToken = sessionData.session.refresh_token;
      
      cookieStore.set('sb-lzlrojoaxrqvmhempnkn-auth-token', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: sessionData.session.expires_at,
        user: sessionData.user
      }), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      return NextResponse.json({
        success: true,
        message: "Forcefully logged in as client",
        user: sessionData.user?.email,
        session: {
          access_token: accessToken.substring(0, 20) + "...",
          expires_at: sessionData.session.expires_at
        },
        redirect: "/client/messages"
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create session" 
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}