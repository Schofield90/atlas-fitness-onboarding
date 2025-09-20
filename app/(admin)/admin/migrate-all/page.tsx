"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { Database, RefreshCw, Check, AlertTriangle } from "lucide-react";

export default function MigrateAllPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/migrate-prices-simple");
      const data = await response.json();
      console.log("Status:", data);
      setStatus(data);
    } catch (error) {
      console.error("Error:", error);
      setStatus({
        error:
          error instanceof Error ? error.message : "Failed to check status",
      });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (
      !confirm(
        "This will migrate ALL membership plans in the database. Continue?",
      )
    ) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/migrate-prices-simple", {
        method: "POST",
      });
      const data = await response.json();
      console.log("Migration result:", data);
      setResult(data);

      // Refresh status after migration
      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error("Migration error:", error);
      setResult({
        error: error instanceof Error ? error.message : "Migration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">
            Emergency Price Migration Tool
          </h1>

          {/* Current Status */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Current Status
            </h2>

            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading...
              </div>
            ) : status?.error ? (
              <div className="text-red-400">
                Error: {status.error}
                {status.details && (
                  <div className="text-sm mt-1">{status.details}</div>
                )}
              </div>
            ) : status?.success ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-white">
                      {status.summary?.total_plans || 0}
                    </div>
                    <div className="text-sm text-gray-400">Total Plans</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-400">
                      {status.summary?.plans_with_price || 0}
                    </div>
                    <div className="text-sm text-gray-400">With Price</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-green-400">
                      {status.summary?.plans_with_price_pennies || 0}
                    </div>
                    <div className="text-sm text-gray-400">
                      With Price Pennies
                    </div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-orange-400">
                      {status.summary?.needs_migration || 0}
                    </div>
                    <div className="text-sm text-gray-400">Needs Migration</div>
                  </div>
                </div>

                {status.user && (
                  <div className="text-sm text-gray-500">
                    Logged in as: {status.user}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Plan Details */}
          {status?.plans && status.plans.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                All Membership Plans
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {status.plans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      {plan.needs_migration ? (
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                      <div>
                        <div className="text-white font-medium">
                          {plan.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Org: {plan.organization_id?.slice(0, 8)}... | Price:{" "}
                          {plan.price ?? "null"} | Pennies:{" "}
                          {plan.price_pennies ?? "null"}
                        </div>
                      </div>
                    </div>
                    {plan.needs_migration && (
                      <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded">
                        Needs Migration
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Migration Actions */}
          <div className="flex gap-4">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Status
            </button>

            <button
              onClick={runMigration}
              disabled={loading || !status?.summary?.needs_migration}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Run Migration ({status?.summary?.needs_migration || 0} plans)
            </button>
          </div>

          {/* Migration Result */}
          {result && (
            <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Migration Result
              </h2>

              {result.error ? (
                <div className="text-red-400">
                  <strong>Error:</strong> {result.error}
                  {result.details && (
                    <div className="text-sm mt-1">{result.details}</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-800 rounded p-4">
                    <div className="text-green-400 font-medium">
                      {result.message}
                    </div>
                    <div className="text-sm text-green-500 mt-1">
                      Checked: {result.checked} | Attempted: {result.attempted}{" "}
                      | Success: {result.migrated}
                    </div>
                  </div>

                  {result.results && (
                    <div>
                      <h3 className="text-white mb-2">Migration Details:</h3>
                      <div className="space-y-1 text-sm">
                        {result.results.map((r: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-gray-400"
                          >
                            {r.status === "SUCCESS" ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            )}
                            {r.name}:{" "}
                            {r.status === "SUCCESS"
                              ? `£${r.oldPrice} → ${r.newPricePennies}p`
                              : r.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && (
                    <div className="bg-red-900/20 border border-red-800 rounded p-3">
                      <div className="text-red-400 text-sm">
                        {result.errors.map((err: string, i: number) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
