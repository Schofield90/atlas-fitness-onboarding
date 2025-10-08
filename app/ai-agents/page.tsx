"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AI Agents redirect page
 * Redirects to the organization-scoped AI agents dashboard
 */
export default function AIAgentsRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirect = async () => {
      try {
        // Get authenticated user via API (uses httpOnly cookies)
        const response = await fetch("/api/auth/user");

        if (!response.ok) {
          console.log("AI Agents: Not authenticated, redirecting to login");
          window.location.href = "/owner-login";
          return;
        }

        const { user } = await response.json();

        if (!user) {
          window.location.href = "/owner-login";
          return;
        }

        // Get organization from API
        const orgResponse = await fetch("/api/auth/organization");

        if (!orgResponse.ok) {
          console.log(
            "AI Agents: No organization found, redirecting to dashboard",
          );
          router.push("/dashboard");
          return;
        }

        const { organization } = await orgResponse.json();

        if (organization?.slug) {
          router.push(`/org/${organization.slug}/ai-agents`);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("AI Agents redirect error:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    redirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-400 text-lg">Loading AI Agents...</p>
      </div>
    </div>
  );
}
