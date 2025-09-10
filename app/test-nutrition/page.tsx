"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function TestNutritionPage() {
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/admin/apply-nutrition-migration");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/apply-nutrition-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      setMigrationResult(data);

      // Refresh status
      await checkStatus();
    } catch (error) {
      console.error("Error running migration:", error);
      setMigrationResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testNutritionProfile = async () => {
    const supabase = createClient();

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in first");
        return;
      }

      // Try to create a test nutrition profile
      const { data, error } = await supabase
        .from("nutrition_profiles")
        .insert({
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e", // Your org ID
          lead_id: null, // Will be set if needed
          age: 30,
          gender: "MALE",
          activity_level: "MODERATELY_ACTIVE",
          goal: "MAINTAIN",
          height_cm: 180,
          weight_kg: 75,
          target_calories: 2500,
          protein_grams: 150,
          carbs_grams: 250,
          fat_grams: 80,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating nutrition profile:", error);
        alert(`Error: ${error.message}`);
      } else {
        console.log("Successfully created nutrition profile:", data);
        alert("Nutrition profile created successfully!");
      }
    } catch (error) {
      console.error("Test failed:", error);
      alert(`Test failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Nutrition System Test & Migration
        </h1>

        {/* Status Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Database Status</h2>
          {loading ? (
            <div className="animate-pulse">Loading...</div>
          ) : (
            <div className="space-y-2">
              {status.status &&
                Object.entries(status.status).map(([table, exists]) => (
                  <div
                    key={table}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-300">{table}:</span>
                    <span
                      className={exists ? "text-green-500" : "text-red-500"}
                    >
                      {exists ? "✓ Exists" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              {status.migrationNeeded && (
                <div className="mt-4 p-3 bg-yellow-900 rounded">
                  <p className="text-yellow-300">⚠️ Migration needed</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Migration Button */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Run Migration</h2>
          <button
            onClick={runMigration}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "Running..." : "Apply Database Migration"}
          </button>

          {migrationResult && (
            <div
              className={`mt-4 p-4 rounded-lg ${migrationResult.success ? "bg-green-900" : "bg-red-900"}`}
            >
              <p
                className={
                  migrationResult.success ? "text-green-300" : "text-red-300"
                }
              >
                {migrationResult.success
                  ? "✓ Migration successful"
                  : "✗ Migration failed"}
              </p>
              {migrationResult.message && (
                <p className="mt-2 text-sm">{migrationResult.message}</p>
              )}
              {migrationResult.error && (
                <p className="mt-2 text-sm text-red-400">
                  {migrationResult.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Test Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Test Nutrition Profile Creation
          </h2>
          <button
            onClick={testNutritionProfile}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Test Profile
          </button>
          <p className="mt-3 text-sm text-gray-400">
            This will attempt to create a test nutrition profile to verify the
            system is working.
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Check the database status above</li>
            <li>If migration is needed, click "Apply Database Migration"</li>
            <li>Once migration is complete, test with "Create Test Profile"</li>
            <li>
              Check the console for detailed error messages if something fails
            </li>
          </ol>

          <div className="mt-4 p-3 bg-blue-900 rounded">
            <p className="text-blue-300 text-sm">
              💡 If you continue to see errors, you may need to run the SQL
              migration directly in Supabase:
            </p>
            <code className="block mt-2 text-xs bg-black p-2 rounded">
              supabase/migrations/20250910_fix_nutrition_and_related_tables.sql
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
