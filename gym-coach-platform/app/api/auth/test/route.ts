import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        session: null,
        cookies: getCookieInfo()
      });
    }

    return NextResponse.json({
      success: true,
      session: session ? {
        user: session.user.email,
        expires_at: session.expires_at,
        access_token: session.access_token ? 'present' : 'missing'
      } : null,
      cookies: getCookieInfo()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      cookies: getCookieInfo()
    });
  }
}

function getCookieInfo() {
  // Helper to debug cookie presence
  if (typeof window !== 'undefined' && document?.cookie) {
    const cookies = document.cookie.split(';').map(c => {
      const [name] = c.trim().split('=');
      return name;
    });
    return {
      browser_cookies: cookies.filter(c => c.startsWith('sb-'))
    };
  }
  return {
    note: 'Server-side check - cookies handled by Next.js'
  };
}