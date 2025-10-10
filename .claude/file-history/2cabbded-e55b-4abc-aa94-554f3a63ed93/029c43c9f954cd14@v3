"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AIAgentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        // Use API endpoint to get organization (bypasses browser auth issues)
        const response = await fetch("/api/auth/get-organization");

        if (!response.ok) {
          console.error("API returned error:", response.status);
          // Not authenticated or error
          router.push("/owner-login?redirect=/ai-agents");
          return;
        }

        const result = await response.json();
        console.log("Organization API response:", result);

        // Check if we have organization data
        if (result.success && result.data?.organization?.slug) {
          console.log(
            "Redirecting to:",
            `/org/${result.data.organization.slug}/ai-agents`,
          );
          router.push(`/org/${result.data.organization.slug}/ai-agents`);
        } else if (result.data?.organization?.id) {
          // Has org but no slug - shouldn't happen but handle it
          console.warn(
            "Organization has no slug, using ID:",
            result.data.organization.id,
          );
          // Fetch the organization to get slug
          const orgResponse = await fetch(
            `/api/organizations/${result.data.organization.id}`,
          );
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.slug) {
              router.push(`/org/${orgData.slug}/ai-agents`);
              return;
            }
          }
          // Fallback to first available org route
          router.push("/dashboard");
        } else {
          // No organization found
          console.log("No organization found, redirecting to onboarding");
          console.log("Result data:", result.data);
          router.push("/onboarding/create-organization");
        }
      } catch (error) {
        console.error("Error redirecting to AI agents:", error);
        router.push("/owner-login?redirect=/ai-agents");
      }
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
