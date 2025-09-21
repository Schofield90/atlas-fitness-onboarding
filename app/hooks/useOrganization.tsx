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

      // Try to get organization ID - first try RPC, then fallback to direct query
      console.log("Fetching organization for user:", currentUser.id);

      let orgData = null;
      let orgError = null;

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_user_organization_id",
        { user_uuid: currentUser.id },
      );

      if (rpcError) {
        console.log("RPC failed, trying direct query:", rpcError);
        // Fallback to direct query if RPC doesn't exist
        const { data: staffData, error: staffError } = await supabase
          .from("organization_staff")
          .select("organization_id")
          .eq("user_id", currentUser.id)
          .eq("is_active", true)
          .single();

        if (staffError) {
          console.error("Direct query also failed:", staffError);
          orgError = staffError;
        } else {
          orgData = staffData?.organization_id;
        }
      } else {
        orgData = rpcData;
      }

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        // Don't throw for missing org, just proceed
        if (orgError.code !== "PGRST116") {
          // Not a "not found" error
          throw orgError;
        }
      }

      console.log("Organization data:", orgData);

      if (!orgData) {
        // No organization found - redirect to onboarding
        console.log(
          "No organization found for user, redirecting to onboarding",
        );
        router.push("/onboarding/create-organization");
        return;
      }

      // Fetch full organization details - try with staff info first, fallback to basic
      let orgDetails = null;
      let detailsError = null;

      // First try with organization_staff join
      const { data: fullDetails, error: fullError } = await supabase
        .from("organizations")
        .select(
          `
          *,
          organization_staff(
            role,
            is_active,
            permissions,
            system_mode,
            visible_systems
          )
        `,
        )
        .eq("id", orgData)
        .single();

      if (!fullError && fullDetails) {
        orgDetails = fullDetails;
      } else {
        // Fallback to just organization data without staff details
        const { data: basicDetails, error: basicError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgData)
          .single();

        if (basicError) {
          console.error("Error fetching organization details:", basicError);
          detailsError = basicError;
        } else {
          orgDetails = basicDetails;
        }
      }

      if (detailsError) {
        throw detailsError;
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
