"use client";

import { useEffect, useState } from "react";

export default function TestSetup() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setupOrganization();
  }, []);

  const setupOrganization = async () => {
    try {
      const response = await fetch("/api/setup-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();
      setResult(data);
      setLoading(false);

      if (data.success) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } catch (error: any) {
      setResult({ error: error.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">
        Setting up your organization...
      </h1>

      {loading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      ) : (
        <pre className="bg-gray-800 p-4 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {result?.success && (
        <p className="mt-4 text-green-400">
          ✓ Organization setup complete! Redirecting to dashboard...
        </p>
      )}
    </div>
  );
}
