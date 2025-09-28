"use client";

import { useState } from "react";

export default function FixAuthPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/emergency-fix-406");
      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/emergency-fix-406", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sam@atlas-gyms.co.uk" })
      });
      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Fix Authentication for sam@atlas-gyms.co.uk</h1>
        
        <div className="space-y-4">
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Current Status"}
          </button>

          <button
            onClick={applyFix}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 ml-4"
          >
            {loading ? "Applying Fix..." : "Apply Emergency Fix"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {status && (
          <div className="mt-8 space-y-4">
            {status.success && (
              <div className="p-4 bg-green-900/50 border border-green-500 rounded">
                <p className="text-green-300 font-bold">✅ {status.message}</p>
              </div>
            )}

            <div className="bg-gray-800 p-6 rounded">
              <h2 className="text-xl font-bold mb-4">Status Report</h2>
              
              {status.status && (
                <div className="space-y-2">
                  {Object.entries(status.status).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-mono">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {status.verifications && (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Verification Results:</h3>
                  <div className="space-y-1">
                    {Object.entries(status.verifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-mono">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status.userId && (
                <div className="mt-4 text-sm text-gray-400">
                  <p>User ID: {status.userId}</p>
                  <p>Organization ID: {status.organizationId}</p>
                  <p>Can Query Org: {status.canQueryOrg ? "✅ Yes" : "❌ No"}</p>
                  <p>Can Query UserOrg: {status.canQueryUserOrg ? "✅ Yes" : "❌ No"}</p>
                </div>
              )}
            </div>

            {status.data && (
              <details className="bg-gray-800 p-4 rounded">
                <summary className="cursor-pointer font-bold">Raw Data (Debug)</summary>
                <pre className="mt-4 text-xs overflow-auto">
                  {JSON.stringify(status.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}