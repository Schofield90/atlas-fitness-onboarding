"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    // Redirect to business profile as the default settings page
    router.push(`/org/${orgSlug}/settings/business`);
  }, [router, orgSlug]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-400">Redirecting to settings...</p>
      </div>
    </div>
  );
}
