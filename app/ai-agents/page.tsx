"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/app/hooks/useOrganization";

/**
 * AI Agents redirect page
 * Redirects to the organization-scoped AI agents dashboard
 */
export default function AIAgentsRedirectPage() {
  const router = useRouter();
  const { currentOrganization, loading } = useOrganization();

  useEffect(() => {
    if (!loading && currentOrganization) {
      // Redirect to org-scoped AI agents page
      router.push(`/org/${currentOrganization.slug}/ai-agents`);
    }
  }, [loading, currentOrganization, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Loading AI Agents...</p>
        </div>
      </div>
    );
  }

  return null;
}
