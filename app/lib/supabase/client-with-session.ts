import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client with proper cookie handling for SSR
export function createSessionClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof window === 'undefined') return undefined;
          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined;
        },
        set(name: string, value: string, options: any) {
          if (typeof window === 'undefined') return;
          let cookieString = `${name}=${encodeURIComponent(value)}`;
          
          if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
          if (options?.path) cookieString += `; path=${options.path}`;
          if (options?.domain) cookieString += `; domain=${options.domain}`;
          if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
          if (options?.secure) cookieString += `; secure`;
          
          document.cookie = cookieString;
        },
        remove(name: string, options: any) {
          if (typeof window === 'undefined') return;
          let cookieString = `${name}=; max-age=0`;
          if (options?.path) cookieString += `; path=${options.path}`;
          if (options?.domain) cookieString += `; domain=${options.domain}`;
          document.cookie = cookieString;
        }
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      // Add proper headers to avoid 406 errors
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    }
  );
}

// Helper to get current session with retry logic
export async function getSessionWithRetry(supabase: ReturnType<typeof createSessionClient>) {
  // First try to get the existing session
  let { data: { session }, error } = await supabase.auth.getSession();
  
  if (session) return session;
  
  // If no session, try to refresh
  const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
  
  if (refreshedSession) return refreshedSession;
  
  // As a last resort, check localStorage directly
  if (typeof window !== 'undefined') {
    const storedAuth = localStorage.getItem('supabase-auth-token');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed?.currentSession?.access_token) {
          // Try to set the session from stored token
          const { data: { user } } = await supabase.auth.getUser(parsed.currentSession.access_token);
          if (user) {
            return parsed.currentSession;
          }
        }
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
      }
    }
  }
  
  return null;
}