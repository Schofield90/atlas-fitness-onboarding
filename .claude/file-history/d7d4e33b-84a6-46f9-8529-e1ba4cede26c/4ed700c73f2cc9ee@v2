"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function AIAgentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const supabase = createClient();

      // Get user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/owner-login");
        return;
      }

      // Check user_organizations first
      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      let orgId = userOrg?.organization_id;

      if (!orgId) {
        // Fallback to owned organization
        const { data: ownedOrg } = await supabase
          .from("organizations")
          .select("id, slug")
          .eq("owner_id", user.id)
          .single();

        orgId = ownedOrg?.id;
      }

      if (!orgId) {
        // Fallback to staff organization
        const { data: staffOrg } = await supabase
          .from("organization_staff")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        orgId = staffOrg?.organization_id;
      }

      if (orgId) {
        // Get org slug for URL
        const { data: org } = await supabase
          .from("organizations")
          .select("slug")
          .eq("id", orgId)
          .single();

        if (org?.slug) {
          router.push(`/org/${org.slug}/ai-agents`);
          return;
        }
      }

      // No organization found
      router.push("/onboarding/create-organization");
    }

    redirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading AI Agents...</p>
      </div>
    </div>
  );
}
