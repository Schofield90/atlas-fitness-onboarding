"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

  const fetchOrganization = async () => {
    try {
      setError(null);
      const supabase = createClient();

      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setUser(null);
        setOrganizationId(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // Use the database function to get organization ID
      const { data: orgData, error: orgError } = await supabase.rpc(
        "get_user_organization_id",
        { user_uuid: currentUser.id },
      );

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        throw orgError;
      }

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
  };

  useEffect(() => {
    fetchOrganization();

    // Set up auth state listener
    const supabase = createClient();
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
  }, []);

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
