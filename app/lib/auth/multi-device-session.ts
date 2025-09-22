import { createClient } from "@/app/lib/supabase/client";

/**
 * Utility functions for managing multi-device authentication sessions
 * Helps debug and resolve concurrent session issues
 */

export interface SessionInfo {
  isValid: boolean;
  sessionId: string | null;
  userId: string | null;
  expiresAt: string | null;
  deviceInfo: {
    userAgent: string;
    timestamp: string;
  };
  error?: string;
}

/**
 * Check if the current session is valid and get session information
 */
export async function getCurrentSessionInfo(): Promise<SessionInfo> {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    const deviceInfo = {
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      timestamp: new Date().toISOString(),
    };

    if (error) {
      return {
        isValid: false,
        sessionId: null,
        userId: null,
        expiresAt: null,
        deviceInfo,
        error: error.message,
      };
    }

    if (!session) {
      return {
        isValid: false,
        sessionId: null,
        userId: null,
        expiresAt: null,
        deviceInfo,
        error: "No active session",
      };
    }

    // Extract session ID from JWT token (for debugging purposes)
    let sessionId: string | null = null;
    try {
      const tokenParts = session.access_token.split(".");
      if (tokenParts.length >= 2) {
        const payload = JSON.parse(atob(tokenParts[1]));
        sessionId = payload.session_id || payload.jti || "unknown";
      }
    } catch (jwtError) {
      console.warn("Could not parse JWT for session ID:", jwtError);
    }

    return {
      isValid: true,
      sessionId,
      userId: session.user.id,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      deviceInfo,
    };
  } catch (error) {
    return {
      isValid: false,
      sessionId: null,
      userId: null,
      expiresAt: null,
      deviceInfo: {
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : "unknown",
        timestamp: new Date().toISOString(),
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refresh the current session if it's about to expire
 */
export async function refreshSessionIfNeeded(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: "No session to refresh" };
    }

    // Check if session expires within the next 5 minutes
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

    if (expiresAt > fiveMinutesFromNow) {
      return { success: true }; // Session is still valid for more than 5 minutes
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate session with server-side check
 */
export async function validateSessionWithServer(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch("/api/auth/session-check", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Session validation failed",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Set up periodic session health checks
 * Useful for long-lived client applications
 */
export function setupSessionHealthCheck(intervalMs: number = 60000) {
  if (typeof window === "undefined") {
    return null; // Server-side, don't set up checks
  }

  const healthCheck = async () => {
    const sessionInfo = await getCurrentSessionInfo();

    if (!sessionInfo.isValid) {
      console.warn("Session health check failed:", sessionInfo.error);

      // Optionally trigger a session refresh or redirect to login
      const refreshResult = await refreshSessionIfNeeded();

      if (!refreshResult.success) {
        console.error("Session refresh failed:", refreshResult.error);
        // Could trigger a logout or login redirect here
      }
    } else {
      console.log("Session health check passed:", {
        sessionId: sessionInfo.sessionId,
        expiresAt: sessionInfo.expiresAt,
      });
    }
  };

  // Run initial check
  healthCheck();

  // Set up periodic checks
  const intervalId = setInterval(healthCheck, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Log session information for debugging multi-device issues
 */
export function logSessionInfo(context: string = "unknown") {
  if (typeof window === "undefined") return;

  getCurrentSessionInfo().then((sessionInfo) => {
    console.log(`[${context}] Session Info:`, {
      isValid: sessionInfo.isValid,
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      expiresAt: sessionInfo.expiresAt,
      userAgent: sessionInfo.deviceInfo.userAgent.substring(0, 100), // Truncate for readability
      timestamp: sessionInfo.deviceInfo.timestamp,
      error: sessionInfo.error,
    });
  });
}
