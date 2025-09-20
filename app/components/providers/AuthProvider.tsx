"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const client = createClient();

    if (!client) {
      setLoading(false);
      return;
    }

    // Check active session
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await client.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          // Try to restore from storage
          const {
            data: { user: restoredUser },
          } = await client.auth.getUser();

          if (restoredUser) {
            // Refresh the session
            const {
              data: { session: refreshedSession },
            } = await client.auth.refreshSession();
            if (refreshedSession) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
            }
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        // Only redirect if not already on a public page
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/signup") &&
          !window.location.pathname.includes("/signin")
        ) {
          router.push("/login");
        }
      } else if (event === "USER_UPDATED") {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    });

    // Set up periodic session refresh (every 10 minutes)
    const refreshInterval = setInterval(
      async () => {
        const {
          data: { session: currentSession },
        } = await client.auth.getSession();
        if (currentSession) {
          const {
            data: { session: refreshedSession },
          } = await client.auth.refreshSession();
          if (refreshedSession) {
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          }
        }
      },
      10 * 60 * 1000,
    ); // 10 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [router]);

  const signOut = async () => {
    try {
      const client = createClient();
      if (!client) return;
      await client.auth.signOut();
      setSession(null);
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const refreshSession = async () => {
    try {
      const client = createClient();
      if (!client) return;
      const {
        data: { session: refreshedSession },
      } = await client.auth.refreshSession();
      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signOut, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
