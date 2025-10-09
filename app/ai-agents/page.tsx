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
          // Not authenticated or error
          router.push("/owner-login?redirect=/ai-agents");
          return;
        }

        const data = await response.json();

        if (data.organization?.slug) {
          router.push(`/org/${data.organization.slug}/ai-agents`);
        } else {
          // No organization found
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
