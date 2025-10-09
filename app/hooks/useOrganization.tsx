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

interface Organization {
  id: string;
  name: string;
  role?: string;
  source?: string;
}

interface OrganizationContextType {
  organizationId: string | null;
  organization: any | null;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  availableOrganizations: Organization[];
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organizationId: null,
  organization: null,
  isLoading: true,
  error: null,
  user: null,
  availableOrganizations: [],
  switchOrganization: async () => {},
  refreshOrganization: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchOrganization = useCallback(async (newOrganizationId: string) => {
    try {
      setError(null);

      // Save to localStorage for immediate UI update
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedOrganizationId", newOrganizationId);
      }

      // Save to database for cross-device sync
      const response = await fetch("/api/auth/switch-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ organizationId: newOrganizationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch organization");
      }

      const result = await response.json();

      // Update local state immediately
      setOrganizationId(result.data.organizationId);
      setOrganization(result.data.organization);

      // Reload the page to fetch fresh data for the new organization
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Switch organization error:", err);
      setError(err.message);
      // Remove from localStorage on error
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedOrganizationId");
      }
    }
  }, []);

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

        // Fetch available organizations first
        const orgsResponse = await fetch("/api/auth/user-organizations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-cache",
        });

        if (orgsResponse.ok) {
          const orgsResult = await orgsResponse.json();
          if (orgsResult.success && orgsResult.data?.organizations) {
            setAvailableOrganizations(orgsResult.data.organizations);
          }
        }

        // Check localStorage for selected organization preference
        let selectedOrgId: string | null = null;
        if (typeof window !== "undefined") {
          selectedOrgId = localStorage.getItem("selectedOrganizationId");
        }

        // If user has a preference and it's in their available orgs, use it
        // Otherwise, use the API's default (most recent org)
        let apiUrl = "/api/auth/get-organization";
        if (selectedOrgId) {
          apiUrl += `?preferredOrgId=${selectedOrgId}`;
        }

        // Use the API endpoint that bypasses RLS issues
        const response = await fetch(apiUrl, {
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

          // Save to localStorage for next time
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedOrganizationId", organizationId);
          }
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
        availableOrganizations,
        switchOrganization,
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
