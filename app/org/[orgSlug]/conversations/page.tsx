"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import UnifiedMessaging from "@/app/components/UnifiedMessaging";

function ConversationsContent() {
  const [userData, setUserData] = useState<any>(null);
  const searchParams = useSearchParams();
  const params = useParams();
  const contactParam = searchParams.get("contact");
  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    console.log("[Conversations] Starting loadUserData");
    try {
      // Use the same API endpoint as useOrganization hook
      const response = await fetch("/api/auth/get-organization", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-cache",
      });

      console.log("[Conversations] API response status:", response.status);

      if (!response.ok) {
        console.error("[Conversations] API request failed:", response.status);
        return;
      }

      const result = await response.json();
      console.log("[Conversations] API result:", result);

      if (!result.success) {
        console.error(
          "[Conversations] API returned error:",
          result.error || "Unknown error",
        );
        return;
      }

      const { organizationId, user, role } = result.data;

      if (!user) {
        console.log("[Conversations] No user in API response");
        return;
      }

      const finalUserData = {
        id: user.id,
        full_name:
          user.user_metadata?.name || user.email?.split("@")[0] || "Coach",
        email: user.email,
        organization_id: organizationId || null,
      };

      console.log("[Conversations] Setting userData:", finalUserData);
      setUserData(finalUserData);
    } catch (error) {
      console.error("[Conversations] Error loading user data:", error);
    }
  };

  // Fallback loading state while user data loads
  if (!userData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading conversations...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {userData && (
        <UnifiedMessaging
          userData={userData}
          initialContactId={contactParam || undefined}
        />
      )}
    </DashboardLayout>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-gray-400">Loading conversations...</div>
          </div>
        </DashboardLayout>
      }
    >
      <ConversationsContent />
    </Suspense>
  );
}
