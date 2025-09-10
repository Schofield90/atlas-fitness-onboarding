"use client";

import { useState, useEffect } from "react";

export default function NutritionStatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/nutrition/status");
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Error checking status:", err);
      setError("Failed to check status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Checking nutrition system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🥗 Nutrition System Status</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {status && (
          <>
            {/* Overall Status */}
            <div
              className={`rounded-lg p-6 mb-6 ${status.status?.overall ? "bg-green-900 border border-green-700" : "bg-yellow-900 border border-yellow-700"}`}
            >
              <h2 className="text-2xl font-semibold mb-2">
                {status.status?.overall
                  ? "✅ System Ready"
                  : "⚠️ Migration Needed"}
              </h2>
              <p className="text-sm opacity-90">{status.message}</p>
            </div>

            {/* Tables Status */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Database Tables</h2>
              <div className="grid grid-cols-2 gap-4">
                {status.status?.tables &&
                  Object.entries(status.status.tables).map(
                    ([table, exists]) => (
                      <div
                        key={table}
                        className="flex items-center justify-between bg-gray-700 rounded p-3"
                      >
                        <span className="text-gray-300">{table}:</span>
                        <span
                          className={exists ? "text-green-400" : "text-red-400"}
                        >
                          {exists ? "✓ Exists" : "✗ Missing"}
                        </span>
                      </div>
                    ),
                  )}
              </div>
            </div>

            {/* Columns Status */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Required Columns</h2>
              <div className="space-y-2">
                {status.status?.columns &&
                  Object.entries(status.status.columns).map(
                    ([column, exists]) => (
                      <div
                        key={column}
                        className="flex items-center justify-between bg-gray-700 rounded p-3"
                      >
                        <span className="text-gray-300">
                          {column.replace(/_/g, " ")}:
                        </span>
                        <span
                          className={exists ? "text-green-400" : "text-red-400"}
                        >
                          {exists ? "✓ Present" : "✗ Missing"}
                        </span>
                      </div>
                    ),
                  )}
              </div>
            </div>

            {/* Migration Instructions */}
            {!status.status?.overall && (
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">📚 How to Fix</h2>
                <ol className="list-decimal list-inside space-y-2 text-blue-200">
                  <li>Open Supabase Dashboard SQL Editor</li>
                  <li>Copy the migration SQL from the project</li>
                  <li>Run the migration in Supabase</li>
                  <li>This page will automatically update when ready</li>
                </ol>
                <div className="mt-4 p-3 bg-blue-800 rounded">
                  <p className="text-sm">
                    <strong>Supabase SQL Editor:</strong>
                    <br />
                    <a
                      href="https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Open SQL Editor →
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {status.status?.overall && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2">🎉 Ready to Use!</h2>
                <p className="text-green-200 mb-4">
                  The nutrition coach system is fully operational. All required
                  tables and columns are in place.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Production URL:</strong>
                    <br />
                    <a
                      href="https://atlas-fitness-onboarding.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-300 hover:text-green-200 underline"
                    >
                      https://atlas-fitness-onboarding.vercel.app
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="text-center mt-6 text-gray-500 text-sm">
              Last checked:{" "}
              {status.timestamp
                ? new Date(status.timestamp).toLocaleString()
                : "Unknown"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
