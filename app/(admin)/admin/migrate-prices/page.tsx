"use client";

import { useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { AlertTriangle, Check, RefreshCw, Database } from "lucide-react";
import toast from "@/app/lib/toast";

interface PlanStatus {
  id: string;
  name: string;
  price: number | null;
  price_pennies: number | null;
  needs_migration: boolean;
}

interface MigrationSummary {
  total_plans: number;
  plans_with_price: number;
  plans_with_price_pennies: number;
  needs_migration: number;
}

export default function MigratePricesPage() {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [status, setStatus] = useState<{
    summary: MigrationSummary;
    plans: PlanStatus[];
  } | null>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch("/api/migrate-prices");
      const data = await response.json();

      console.log("Status check response:", response.status, data);

      if (response.ok && data.success) {
        setStatus(data);
        if (data.summary.needs_migration === 0) {
          toast.success("All plans already have price_pennies set!");
        } else {
          toast.info(`${data.summary.needs_migration} plans need migration`);
        }
      } else {
        console.error("Status check failed:", data);
        const errorMessage = data.error || "Failed to check status";
        toast.error(`Error: ${errorMessage}`);

        // Show more detail if available
        if (data.details) {
          console.error("Error details:", data.details);
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
      toast.error(
        `Network error: ${error instanceof Error ? error.message : "Failed to check migration status"}`,
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  const runMigration = async () => {
    setLoading(true);
    setMigrationResult(null);

    try {
      const response = await fetch("/api/migrate-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMigrationResult(data);
        toast.success(data.message || "Migration completed successfully");
        // Refresh status after migration
        await checkStatus();
      } else {
        toast.error(data.error || "Migration failed");
        setMigrationResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      console.error("Error running migration:", error);
      toast.error("Failed to run migration");
      setMigrationResult({ error: "Failed to run migration" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Price Migration Tool
            </h1>
            <p className="text-gray-400">
              Migrate membership plan prices from legacy 'price' field to
              'price_pennies' field
            </p>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  This tool will migrate prices from the old decimal format to
                  the new pennies format:
                </p>
                <ul className="list-disc ml-5 space-y-1 text-gray-400">
                  <li>Old format: price = 29.99 (stored as decimal)</li>
                  <li>New format: price_pennies = 2999 (stored as integer)</li>
                  <li>
                    Only plans with price set but price_pennies empty will be
                    migrated
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={checkStatus}
              disabled={checkingStatus}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {checkingStatus ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check Status
                </>
              )}
            </button>

            <button
              onClick={runMigration}
              disabled={
                loading || !status || status.summary.needs_migration === 0
              }
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Run Migration
                </>
              )}
            </button>
          </div>

          {/* Status Display */}
          {status && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Current Status
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-3xl font-bold text-white">
                      {status.summary.total_plans}
                    </div>
                    <div className="text-sm text-gray-400">Total Plans</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-3xl font-bold text-blue-400">
                      {status.summary.plans_with_price}
                    </div>
                    <div className="text-sm text-gray-400">
                      With Price Field
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-3xl font-bold text-green-400">
                      {status.summary.plans_with_price_pennies}
                    </div>
                    <div className="text-sm text-gray-400">
                      With Price Pennies
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-3xl font-bold text-orange-400">
                      {status.summary.needs_migration}
                    </div>
                    <div className="text-sm text-gray-400">Needs Migration</div>
                  </div>
                </div>
              </div>

              {/* Plans List */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Membership Plans
                </h2>
                <div className="space-y-3">
                  {status.plans.length === 0 ? (
                    <p className="text-gray-400">No membership plans found</p>
                  ) : (
                    status.plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          plan.needs_migration
                            ? "bg-orange-900/20 border border-orange-800"
                            : "bg-gray-700/30 border border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {plan.needs_migration ? (
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                          ) : (
                            <Check className="w-5 h-5 text-green-400" />
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {plan.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              price:{" "}
                              {plan.price !== null ? `£${plan.price}` : "null"}{" "}
                              | price_pennies:{" "}
                              {plan.price_pennies !== null
                                ? `${plan.price_pennies}p`
                                : "null"}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm">
                          {plan.needs_migration ? (
                            <span className="px-3 py-1 bg-orange-900/30 text-orange-400 rounded-full">
                              Needs Migration
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full">
                              ✓ Migrated
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Migration Result */}
          {migrationResult && (
            <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Migration Result
              </h2>

              {migrationResult.error ? (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-medium">
                        {migrationResult.error}
                      </p>
                      {migrationResult.details && (
                        <p className="text-red-400 text-sm mt-1">
                          {migrationResult.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-green-300 font-medium">
                          {migrationResult.message}
                        </p>
                        <p className="text-green-400 text-sm mt-1">
                          Checked: {migrationResult.checked} plans | Migrated:{" "}
                          {migrationResult.migrated} plans
                        </p>
                      </div>
                    </div>
                  </div>

                  {migrationResult.errors &&
                    migrationResult.errors.length > 0 && (
                      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
                        <p className="text-yellow-300 font-medium mb-2">
                          Warnings:
                        </p>
                        <ul className="list-disc ml-5 text-yellow-400 text-sm">
                          {migrationResult.errors.map(
                            (err: string, i: number) => (
                              <li key={i}>{err}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {migrationResult.verification && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">
                        Verification
                      </h3>
                      <div className="space-y-2">
                        {migrationResult.verification.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                          >
                            <span className="text-gray-300">{v.name}</span>
                            <span
                              className={`text-sm px-2 py-1 rounded ${
                                v.status === "MIGRATED_SUCCESSFULLY"
                                  ? "bg-green-900/30 text-green-400"
                                  : v.status === "PRICE_PENNIES_ONLY"
                                    ? "bg-blue-900/30 text-blue-400"
                                    : "bg-yellow-900/30 text-yellow-400"
                              }`}
                            >
                              {v.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>
              This is a one-time migration tool. Once all plans are migrated,
              this tool is no longer needed.
            </p>
            <p className="mt-1">
              The application now uses price_pennies for all price storage and
              display.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
