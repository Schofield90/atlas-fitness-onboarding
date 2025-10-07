"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface OrganizationContextType {
  organizationId: string | null;
  organization: any | null;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organizationId: null,
  organization: null,
  isLoading: true,
  error: null,
  user: null,
  refreshOrganization: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(
    async (retryCount = 0) => {
      // Only run on client side
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      // Skip organization fetching on login/auth pages to prevent 406 errors
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isAuthPage = [
          "/owner-login",
          "/signin",
          "/signup",
          "/login",
          "/auth",
        ].some((path) => currentPath.startsWith(path));

        if (isAuthPage) {
          setIsLoading(false);
          return;
        }
      }

      try {
        setError(null);

        // Use the API endpoint that bypasses RLS issues
        const response = await fetch("/api/auth/get-organization", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for authentication
          cache: "no-cache", // Prevent stale auth responses
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Retry 401 errors once in case of temporary auth issues
            if (retryCount < 1) {
              console.log("Auth failed, retrying in 1 second...");
              setTimeout(() => fetchOrganization(retryCount + 1), 1000);
              return;
            }
            console.log(
              "Not authenticated after retry - clearing organization state",
            );
            setUser(null);
            setOrganizationId(null);
            setOrganization(null);
            setIsLoading(false);
            return;
          }
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch organization");
        }

        const {
          organizationId,
          organization,
          user: currentUser,
          role,
        } = result.data;

        // Set user data
        setUser(currentUser);

        // Set organization data
        console.log(
          "[useOrganization] API returned - orgId:",
          organizationId,
          "org:",
          organization?.name,
        );
        if (organizationId && organization) {
          console.log(
            "[useOrganization] Setting organizationId:",
            organizationId,
          );
          setOrganizationId(organizationId);
          setOrganization(organization);
        } else {
          console.log(
            "[useOrganization] No organization found, clearing state",
          );
          setOrganizationId(null);
          setOrganization(null);
        }
      } catch (err: any) {
        console.error("Organization fetch error:", err);
        setError(err.message);

        // Clear state on error
        setUser(null);
        setOrganizationId(null);
        setOrganization(null);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    fetchOrganization();

    // Note: Removed auth state listener because we now use httpOnly cookies
    // Auth state is managed server-side, not in localStorage
    // The /api/auth/get-organization endpoint checks auth on each request
  }, [fetchOrganization]);

  return (
    <OrganizationContext.Provider
      value={{
        organizationId,
        organization,
        isLoading,
        error,
        user,
        refreshOrganization: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
};
