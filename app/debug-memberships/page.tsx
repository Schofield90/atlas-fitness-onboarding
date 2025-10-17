"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { getCurrentUserOrganization } from "@/app/lib/organization-service";

export default function DebugMembershipsPage() {
  const [debugData, setDebugData] = useState<any>({
    loading: true,
    user: null,
    organizationId: null,
    membershipPlans: [],
    allMembershipPlans: [],
    error: null,
  });

  useEffect(() => {
    async function fetchDebugData() {
      const supabase = createClient();

      try {
        // Get user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Get organization
        const { organizationId, error: orgError } =
          await getCurrentUserOrganization();

        // Get membership plans for the current org
        let membershipPlans = [];
        if (organizationId) {
          const response = await fetch(
            `/api/membership-plans-bypass?organizationId=${organizationId}`,
          );
          const result = await response.json();
          membershipPlans = result.data || [];
        }

        // Get ALL membership plans (service role needed)
        const allPlansResponse = await fetch("/api/debug/all-membership-plans");
        const allPlansResult = await allPlansResponse.json();

        setDebugData({
          loading: false,
          user: user ? { id: user.id, email: user.email } : null,
          organizationId,
          organizationError: orgError,
          membershipPlans,
          allMembershipPlans: allPlansResult.data || [],
          error: null,
        });
      } catch (error: any) {
        setDebugData((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    }

    fetchDebugData();
  }, []);

  if (debugData.loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Membership Plans</h1>
          <p>Loading debug data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Membership Plans</h1>

        {/* User Info */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Current User</h2>
          <pre className="text-sm text-gray-300">
            {JSON.stringify(debugData.user, null, 2)}
          </pre>
        </div>

        {/* Organization Info */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Current Organization</h2>
          <p className="text-sm mb-2">
            Organization ID:{" "}
            <span className="font-mono text-blue-400">
              {debugData.organizationId || "None"}
            </span>
          </p>
          {debugData.organizationError && (
            <p className="text-red-400 text-sm">
              Error: {debugData.organizationError}
            </p>
          )}
        </div>

        {/* Membership Plans for Current Org */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Membership Plans for Current Organization
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            Found {debugData.membershipPlans.length} plan(s) for org:{" "}
            {debugData.organizationId}
          </p>
          {debugData.membershipPlans.length > 0 ? (
            <div className="space-y-2">
              {debugData.membershipPlans.map((plan: any) => (
                <div key={plan.id} className="bg-gray-700 p-3 rounded">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-gray-400">
                    Price: £{(plan.price || plan.price_pennies || 0) / 100} |
                    Active: {plan.is_active ? "Yes" : "No"} | Org ID:{" "}
                    <span className="font-mono text-xs">
                      {plan.organization_id}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No membership plans found for this organization
            </p>
          )}
        </div>

        {/* ALL Membership Plans */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">
            ALL Membership Plans in Database
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            Total plans across all organizations:{" "}
            {debugData.allMembershipPlans.length}
          </p>
          {debugData.allMembershipPlans.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {debugData.allMembershipPlans.map((plan: any) => (
                <div key={plan.id} className="bg-gray-700 p-3 rounded">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-gray-400">
                    Price: £{(plan.price || plan.price_pennies || 0) / 100} |
                    Active: {plan.is_active ? "Yes" : "No"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Org ID:{" "}
                    <span className="font-mono">{plan.organization_id}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No membership plans found in database
            </p>
          )}
        </div>

        {/* Error Display */}
        {debugData.error && (
          <div className="bg-red-900 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <pre className="text-sm">{debugData.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
