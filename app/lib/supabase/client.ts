import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton instance variable
let supabaseInstance: SupabaseClient<Database> | null = null;

// Custom cookie storage that prevents chunking by using sessionStorage for large values
const createCustomCookieHandler = () => {
  return {
    get(name: string) {
      if (typeof document === "undefined") return undefined;

      // First check sessionStorage for large auth tokens
      try {
        const sessionValue = sessionStorage.getItem(`supabase.${name}`);
        if (sessionValue && sessionValue !== "sessionStorage") {
          return sessionValue;
        }
      } catch (e) {
        // Ignore if sessionStorage is not available
      }

      // Handle both chunked and normal cookies
      const cookies = document.cookie.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          if (key && value) {
            acc[key] = decodeURIComponent(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // Check if it's a sessionStorage marker
      if (cookies[name] === "sessionStorage") {
        try {
          return sessionStorage.getItem(`supabase.${name}`);
        } catch (e) {
          return cookies[name];
        }
      }

      // Check for chunked cookies (atlas-fitness-auth.0, atlas-fitness-auth.1, etc.)
      const chunkPrefix = `${name}.`;
      const chunks = Object.entries(cookies)
        .filter(([key]) => key.startsWith(chunkPrefix))
        .sort(([a], [b]) => {
          const aIndex = parseInt(a.split(".").pop() || "0");
          const bIndex = parseInt(b.split(".").pop() || "0");
          return aIndex - bIndex;
        })
        .map(([, value]) => value);

      if (chunks.length > 0) {
        // Clear chunked cookies immediately to prevent corruption
        chunks.forEach((_, index) => {
          document.cookie = `${name}.${index}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        });
        const combinedValue = chunks.join("");
        // Store in sessionStorage for future use
        try {
          sessionStorage.setItem(`supabase.${name}`, combinedValue);
        } catch (e) {
          // Ignore if sessionStorage is not available
        }
        return combinedValue;
      }

      return cookies[name];
    },
    set(name: string, value: string, options: any) {
      if (typeof document === "undefined") return;

      // Use sessionStorage for large auth tokens to prevent cookie size limits
      if (name.includes("auth") && value.length > 3500) {
        try {
          sessionStorage.setItem(`supabase.${name}`, value);
          // Set a small marker cookie
          const marker = "sessionStorage";
          const cookieString = `${name}=${encodeURIComponent(marker)}; path=/; ${
            options?.httpOnly ? "HttpOnly; " : ""
          }${options?.secure ? "Secure; " : ""}SameSite=Lax`;
          document.cookie = cookieString;
          return;
        } catch (e) {
          console.warn("SessionStorage not available, falling back to cookie");
        }
      }

      // Normal cookie handling for smaller values
      const cookieString = `${name}=${encodeURIComponent(value)}; path=/; ${
        options?.httpOnly ? "HttpOnly; " : ""
      }${options?.secure ? "Secure; " : ""}SameSite=Lax`;
      document.cookie = cookieString;
    },
    remove(name: string, options: any) {
      if (typeof document === "undefined") return;

      // Remove from sessionStorage if it exists
      try {
        sessionStorage.removeItem(`supabase.${name}`);
      } catch (e) {
        // Ignore if sessionStorage is not available
      }

      // Remove cookie
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

      // Also remove any chunked cookies
      for (let i = 0; i < 10; i++) {
        document.cookie = `${name}.${i}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    },
  };
};

// Create singleton client function
function createSupabaseClient(): SupabaseClient<Database> | null {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return null;
  }

  try {
    const cookieHandler = createCustomCookieHandler();

    const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: cookieHandler.get,
        set: cookieHandler.set,
        remove: cookieHandler.remove,
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "atlas-fitness-auth",
        flowType: "pkce",
        storage:
          typeof window !== "undefined"
            ? {
                getItem: (key: string) => cookieHandler.get(key),
                setItem: (key: string, value: string) =>
                  cookieHandler.set(key, value, {}),
                removeItem: (key: string) => cookieHandler.remove(key, {}),
              }
            : undefined,
      },
    });

    return client;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return null;
  }
}

// Singleton instance getter
export function getSupabaseClient(): SupabaseClient<Database> | null {
  // During SSR, return null to prevent errors
  if (typeof window === "undefined") {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
    if (supabaseInstance) {
      console.log("Supabase client initialized successfully");
    }
  }

  return supabaseInstance;
}

// Create and export a function that returns the singleton client (backwards compatibility)
export function createClient(): SupabaseClient<Database> | null {
  return getSupabaseClient();
}

// Export default singleton instance for convenience
export const supabase = getSupabaseClient();

// Export default
export default supabase;
