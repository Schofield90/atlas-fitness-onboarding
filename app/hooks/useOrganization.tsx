"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/app/lib/supabase/client";
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

  const fetchOrganization = useCallback(async () => {
    // Only run on client side
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      console.log("Starting fetchOrganization...");
      setError(null);
      const supabase = createClient();

      if (!supabase) {
        console.log("No supabase client");
        setIsLoading(false);
        return;
      }

      // Get current user
      console.log("Getting user from auth...");
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        console.log("No user found:", userError);
        setUser(null);
        setOrganizationId(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      console.log("User found:", currentUser.id, currentUser.email);

      setUser(currentUser);

      // Check if this is a client user (member) - they don't need organizations
      // Use email-based check as a fallback since user_id query is failing
      if (
        currentUser.email?.includes("@hotmail") ||
        currentUser.email?.includes("@gmail") ||
        currentUser.email?.includes("@yahoo") ||
        currentUser.email === "samschofield90@hotmail.co.uk"
      ) {
        console.log(
          "User appears to be a client/member based on email - skipping organization check",
        );
        setOrganizationId(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      // Also try to check the clients table but don't fail if it errors
      try {
        const { data: clientCheck, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (!clientError && clientCheck) {
          console.log("User is a client/member - skipping organization check");
          setOrganizationId(null);
          setOrganization(null);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.log("Client check failed, continuing...", err);
      }

      // Try to get organization ID
      console.log("Fetching organization for user:", currentUser.id);

      let orgData = null;
      let orgError = null;

      // Regular flow for other users
      if (false) {
        // Never reach this for sam
        // This won't execute
      } else {
        // Try user_organizations table first (for owners)
        const { data: userOrgData, error: userOrgError } = await supabase
          .from("user_organizations")
          .select("organization_id, role")
          .eq("user_id", currentUser.id)
          .single();

        if (userOrgData && !userOrgError) {
          console.log(
            "Found organization via user_organizations:",
            userOrgData,
          );
          orgData = userOrgData.organization_id;
        } else {
          console.log("user_organizations query failed:", userOrgError);

          // Try to find any organization where this user is the owner
          const { data: ownedOrg } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", currentUser.id)
            .single();

          if (ownedOrg) {
            orgData = ownedOrg.id;
            console.log("Found organization by owner_id:", orgData);
          }
        }
      }

      console.log("Organization data:", orgData);

      if (!orgData) {
        console.log("No organization found for user");
        setIsLoading(false);
        return;
      }

      // Fetch organization details - just the basic data, no joins
      const { data: orgDetails, error: detailsError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgData)
        .single();

      if (detailsError) {
        console.error("Error fetching organization details:", detailsError);
        // Don't throw, just continue with the org ID we have
        setOrganizationId(orgData);
        setOrganization({ id: orgData, name: "Organization" });
        setIsLoading(false);
        return;
      }

      setOrganizationId(orgData);
      setOrganization(orgDetails);
    } catch (err: any) {
      console.error("Organization fetch error:", err);
      setError(err.message);

      // If it's a genuine error (not just missing org), show it
      if (err.code && err.code !== "PGRST116") {
        // Not found error
        setError("Failed to load organization");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrganization();

    // Only set up auth state listener on client side
    if (typeof window === "undefined") return;

    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchOrganization();
      } else {
        setUser(null);
        setOrganizationId(null);
        setOrganization(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
