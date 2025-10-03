import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";

interface EmergencyAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
  isEmergencyMode?: boolean;
}

/**
 * Emergency authentication system for when Supabase Auth is down
 * This should ONLY be used when the primary auth system is unavailable
 */
export async function emergencyAuth(
  email: string,
  password: string,
): Promise<EmergencyAuthResult> {
  // First, always try the normal Supabase auth
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name,
        },
        isEmergencyMode: false,
      };
    }
  } catch (e) {
    console.error("Normal auth failed:", e);
  }

  // If normal auth fails, check if it's a known Supabase issue
  // For sam@gymleadhub.co.uk ONLY during this outage
  if (
    email === "sam@gymleadhub.co.uk" &&
    password === process.env.EMERGENCY_PASSWORD
  ) {
    // Set a temporary session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "emergency_auth",
      JSON.stringify({
        user_id: "64cbbca2-a091-4bb6-99c2-5b8e90a31c4e",
        email: "sam@gymleadhub.co.uk",
        name: "Sam",
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400, // 24 hours
      },
    );

    return {
      success: true,
      user: {
        id: "64cbbca2-a091-4bb6-99c2-5b8e90a31c4e",
        email: "sam@gymleadhub.co.uk",
        name: "Sam",
      },
      isEmergencyMode: true,
    };
  }

  return {
    success: false,
    error:
      "Authentication service is currently unavailable. Please try again later.",
  };
}

/**
 * Check if user has emergency auth session
 */
export async function checkEmergencyAuth(): Promise<EmergencyAuthResult> {
  const cookieStore = await cookies();
  const emergencyCookie = cookieStore.get("emergency_auth");

  if (emergencyCookie) {
    try {
      const data = JSON.parse(emergencyCookie.value);

      // Check if expired
      if (data.expires && data.expires < Date.now()) {
        cookieStore.delete("emergency_auth");
        return { success: false, error: "Session expired" };
      }

      return {
        success: true,
        user: {
          id: data.user_id,
          email: data.email,
          name: data.name,
        },
        isEmergencyMode: true,
      };
    } catch (e) {
      console.error("Invalid emergency auth cookie:", e);
    }
  }

  // Try normal Supabase auth
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name,
        },
        isEmergencyMode: false,
      };
    }
  } catch (e) {
    console.error("Error checking auth:", e);
  }

  return { success: false, error: "Not authenticated" };
}

/**
 * Clear emergency auth session
 */
export async function clearEmergencyAuth() {
  const cookieStore = await cookies();
  cookieStore.delete("emergency_auth");
}
