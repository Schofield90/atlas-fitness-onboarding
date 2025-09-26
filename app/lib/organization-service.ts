import { createClient } from "./supabase/client";

export async function getCurrentUserOrganization() {
  // Check if we're in browser context
  if (typeof window === "undefined") {
    return { organizationId: null, error: "Server-side rendering context" };
  }

  const supabase = createClient();
  if (!supabase) {
    return { organizationId: null, error: "Supabase client not available" };
  }

  try {
    // Get current user - use getSession instead of getUser to avoid auth refresh issues
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      // Don't return error immediately - check if we have a cached session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { organizationId: null, error: "Not authenticated" };
      }
    }

    const user = session?.user || (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { organizationId: null, error: "Not authenticated" };
    }

    // Get user's organization from user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrgError || !userOrg?.organization_id) {
      console.error(
        "No organization found in user_organizations:",
        userOrgError,
      );

      // Try to get organization by owner as fallback
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (orgError || !orgData) {
        // Use default Atlas Fitness organization as fallback
        const defaultOrgId = "63589490-8f55-4157-bd3a-e141594b748e";

        // Create user_organizations entry with default org
        await supabase
          .from("user_organizations")
          .insert({
            user_id: user.id,
            organization_id: defaultOrgId,
            role: "member",
          })
          .then(() =>
            console.log("Created user_organizations entry with default org"),
          )
          .catch((error) => {
            // Ignore duplicate key errors
            if (!error.message?.includes("duplicate")) {
              console.error("Error creating user organization:", error);
            }
          });

        return { organizationId: defaultOrgId, error: null };
      }

      // Create user_organizations entry if they own an org but don't have the entry
      await supabase.from("user_organizations").insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: "owner",
      });

      return { organizationId: orgData.id, error: null };
    }

    return { organizationId: userOrg.organization_id, error: null };
  } catch (error: unknown) {
    console.error("Error getting organization:", error);
    return {
      organizationId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
