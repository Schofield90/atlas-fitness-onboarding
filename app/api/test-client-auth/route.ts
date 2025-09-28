import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('auth')
    );
    
    // Try to manually parse the auth token
    let authToken = null;
    const tokenCookie = allCookies.find(c => c.name.includes('auth-token'));
    if (tokenCookie) {
      try {
        authToken = JSON.parse(tokenCookie.value);
      } catch (e) {
        authToken = tokenCookie.value;
      }
    }
    
    // Also check Authorization header
    const authHeader = request.headers.get('authorization');
    
    // Try creating a Supabase client with the cookies
    const { createServerClient } = await import("@supabase/ssr");
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Silent fail
            }
          },
        },
      },
    );
    
    // Get the user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Use service role to check client record
    let clientData = null;
    if (user) {
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: client } = await adminClient
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();
        
      clientData = client;
    }
    
    return NextResponse.json({
      success: true,
      cookies: {
        total: allCookies.length,
        authRelated: authCookies.map(c => ({
          name: c.name,
          valueLength: c.value.length,
          hasValue: !!c.value
        }))
      },
      authHeader: !!authHeader,
      authToken: authToken ? {
        hasToken: true,
        hasAccessToken: !!authToken.access_token,
        hasUser: !!authToken.user
      } : null,
      user: user ? {
        id: user.id,
        email: user.email,
        hasClient: !!clientData
      } : null,
      error: error?.message || null
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}