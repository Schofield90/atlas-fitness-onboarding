"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /crm/ai-chat-agents to /org/[orgSlug]/crm/ai-chat-agents
 *
 * This is a navigation helper since DashboardLayout uses flat routes
 * but the actual page needs orgSlug for organization context
 */
export default function AIChatAgentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        // Get organization from API
        const response = await fetch("/api/auth/get-organization");
        const result = await response.json();

        if (result.success && result.data?.organization) {
          // Use organization slug or ID for route
          const orgSlug = result.data.organization.slug || result.data.organization.id;
          router.push(`/org/${orgSlug}/crm/ai-chat-agents`);
        } else {
          // Fallback to login if no organization
          router.push("/owner-login");
        }
      } catch (error) {
        console.error("Failed to redirect to AI Chat Agents:", error);
        router.push("/owner-login");
      }
    };

    redirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading AI Chat Agents...</p>
      </div>
    </div>
  );
}
