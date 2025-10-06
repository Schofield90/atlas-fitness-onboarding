"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/app/hooks/useOrganization";
import DashboardLayout from "@/app/components/DashboardLayout";
import { AlertTriangle, CheckCircle, Shield, Users } from "lucide-react";

interface BillingSettings {
  billing_mode: "goteamup" | "crm" | "hybrid";
  require_manual_approval: boolean;
  allow_auto_billing: boolean;
  migration_status: "not_started" | "in_progress" | "completed" | "rolled_back";
  migration_started_at: string | null;
  notes: string | null;
}

interface MembershipStats {
  total: number;
  goteamup: number;
  crm: number;
  paused: number;
}

export default function BillingMigrationPage() {
  const { organizationId } = useOrganization();
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadSettings();
      loadStats();
    }
  }, [organizationId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/settings/billing-migration?organizationId=${organizationId}`);
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/settings/billing-migration/stats?organizationId=${organizationId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const updateSettings = async (updates: Partial<BillingSettings>) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/billing-migration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, ...updates }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setMessage({ type: "success", text: "Settings updated successfully" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
    } finally {
      setSaving(false);
    }
  };

  const startMigration = async () => {
    if (!confirm("Start migration? This will begin transitioning billing from GoTeamUp to the CRM.")) {
      return;
    }

    await updateSettings({
      migration_status: "in_progress",
      migration_started_at: new Date().toISOString(),
    });
  };

  const completeMigration = async () => {
    if (!confirm("Complete migration? This will switch ALL billing to the CRM and disable GoTeamUp billing checks.")) {
      return;
    }

    await updateSettings({
      billing_mode: "crm",
      migration_status: "completed",
      allow_auto_billing: true,
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Migration Control</h1>
          <p className="text-gray-600">
            Safely transition billing from GoTeamUp to the CRM without double-charging clients
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important: Prevent Double Billing</h3>
              <p className="mt-2 text-sm text-yellow-700">
                While billing_source is set to "goteamup", the CRM will NOT charge any clients automatically.
                This allows you to run both systems side-by-side safely during testing.
              </p>
            </div>
          </div>
        </div>

        {/* Current Status */}
        {settings && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Billing Mode</span>
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 capitalize">{settings.billing_mode}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {settings.billing_mode === "goteamup" && "GoTeamUp handles all billing"}
                  {settings.billing_mode === "crm" && "CRM handles all billing"}
                  {settings.billing_mode === "hybrid" && "Per-client control"}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Migration Status</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 capitalize">{settings.migration_status.replace("_", " ")}</p>
                {settings.migration_started_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Started: {new Date(settings.migration_started_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Membership Stats */}
            {stats && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <Users className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-medium text-gray-900">Membership Breakdown</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">GoTeamUp Billing</p>
                    <p className="text-xl font-bold text-blue-600">{stats.goteamup}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CRM Billing</p>
                    <p className="text-xl font-bold text-green-600">{stats.crm}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paused</p>
                    <p className="text-xl font-bold text-orange-600">{stats.paused}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Safety Settings */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Safety Settings</h3>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.require_manual_approval}
                    onChange={(e) => updateSettings({ require_manual_approval: e.target.checked })}
                    disabled={saving}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Require manual approval for all charges
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allow_auto_billing}
                    onChange={(e) => updateSettings({ allow_auto_billing: e.target.checked })}
                    disabled={saving || settings.billing_mode === "goteamup"}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Allow automatic billing (only when billing_mode = crm)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Migration Actions */}
        {settings && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Migration Steps</h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className={`border-l-4 p-4 ${settings.migration_status !== "not_started" ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">1. Import Data from GoTeamUp</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Import clients and memberships. All will be set to billing_source="goteamup" automatically.
                    </p>
                  </div>
                  {settings.migration_status === "not_started" && (
                    <a
                      href="/dashboard/import"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Go to Import
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className={`border-l-4 p-4 ${settings.migration_status === "in_progress" || settings.migration_status === "completed" ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">2. Start Migration (Hybrid Mode)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Test CRM billing with a few clients while GoTeamUp continues billing everyone else.
                      Change individual clients to billing_source="crm" to test.
                    </p>
                  </div>
                  {settings.migration_status === "not_started" && (
                    <button
                      onClick={startMigration}
                      disabled={saving}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:opacity-50"
                    >
                      Start Migration
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className={`border-l-4 p-4 ${settings.migration_status === "completed" ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">3. Complete Migration</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Switch ALL clients to CRM billing. GoTeamUp billing should be disabled before this step.
                    </p>
                  </div>
                  {settings.migration_status === "in_progress" && (
                    <button
                      onClick={completeMigration}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                    >
                      Complete Migration
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
