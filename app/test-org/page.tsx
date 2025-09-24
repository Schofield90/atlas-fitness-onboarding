"use client";

import { useOrganization } from "@/app/hooks/useOrganization";
import { useEffect } from "react";

export default function TestOrgPage() {
  const { organizationId, organization, isLoading, error, user } =
    useOrganization();

  // Force re-render with timestamp
  const timestamp = new Date().toISOString();

  useEffect(() => {
    console.log("TEST PAGE LOADED AT:", timestamp);
    console.log("Organization State:", {
      organizationId,
      organization,
      isLoading,
      error,
      user: user?.email,
    });
  }, [organizationId, organization, isLoading, error, user]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Organization Test Page</h1>
      <p className="text-sm text-gray-400 mb-4">Page loaded: {timestamp}</p>

      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Loading State</h2>
          <p className={isLoading ? "text-yellow-400" : "text-green-400"}>
            {isLoading ? "Loading..." : "Ready"}
          </p>
        </div>

        {user && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">User</h2>
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
          </div>
        )}

        {organizationId && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Organization ID</h2>
            <p className="font-mono">{organizationId}</p>
          </div>
        )}

        {organization && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Organization Details</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(organization, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="bg-red-900 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-blue-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open browser console (F12)</li>
            <li>Look for "SPECIAL BYPASS ACTIVATED" message</li>
            <li>If you see it, the new code is running</li>
            <li>If not, try hard refresh (Cmd+Shift+R)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
