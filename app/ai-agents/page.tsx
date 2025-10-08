"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

/**
 * AI Agents redirect page
 * Redirects to the organization-scoped AI agents dashboard
 */
export default function AIAgentsRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const redirect = async () => {
      try {
        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Get user's organization
        const { data: userData } = await supabase
          .from("users")
          .select("organization_id, organizations(slug)")
          .eq("id", user.id)
          .single();

        if (userData?.organizations?.slug) {
          router.push(`/org/${userData.organizations.slug}/ai-agents`);
        } else {
          // Fallback to dashboard
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Redirect error:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    redirect();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-400 text-lg">Loading AI Agents...</p>
      </div>
    </div>
  );
}
