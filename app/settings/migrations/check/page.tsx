"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function MigrationCheckPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/migration/check-status");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to check status:", error);
      setData({ error: "Failed to check status" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Migration Data Check</h1>

        {data?.success ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Data Import Summary
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-3xl font-bold text-blue-400">
                    {data.counts.clients}
                  </p>
                  <p className="text-sm text-gray-400">Total Clients</p>
                </div>
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-3xl font-bold text-green-400">
                    {data.counts.bookings}
                  </p>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                </div>
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-3xl font-bold text-purple-400">
                    {data.counts.payments}
                  </p>
                  <p className="text-sm text-gray-400">Total Payments</p>
                </div>
              </div>
            </div>

            {/* Recent Job Status */}
            {data.recentJob && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Recent Migration Job
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Job ID:</span>
                    <span className="font-mono">
                      {data.recentJob.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span
                      className={`font-medium ${
                        data.recentJob.status === "completed"
                          ? "text-green-400"
                          : data.recentJob.status === "failed"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }`}
                    >
                      {data.recentJob.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span>
                      {new Date(data.recentJob.created).toLocaleString()}
                    </span>
                  </div>
                  {data.recentJob.metadata && (
                    <div className="mt-4 p-3 bg-gray-700 rounded">
                      <p className="text-xs text-gray-400 mb-2">
                        Import Results:
                      </p>
                      <div className="space-y-1 text-xs">
                        {data.recentJob.metadata.clients_imported && (
                          <div>
                            Clients Imported:{" "}
                            {data.recentJob.metadata.clients_imported}
                          </div>
                        )}
                        {data.recentJob.metadata.attendance_imported && (
                          <div>
                            Attendance Imported:{" "}
                            {data.recentJob.metadata.attendance_imported}
                          </div>
                        )}
                        {data.recentJob.metadata.payments_imported && (
                          <div>
                            Payments Imported:{" "}
                            {data.recentJob.metadata.payments_imported}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Clients */}
            {data.samples.clients.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Recently Added Clients
                </h2>
                <div className="space-y-2">
                  {data.samples.clients.map((client: any) => (
                    <div
                      key={client.id}
                      className="flex justify-between text-sm p-2 bg-gray-700 rounded"
                    >
                      <span>{client.name || client.email}</span>
                      <span className="text-gray-400">
                        {new Date(client.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bookings */}
            {data.samples.bookings.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Recently Added Bookings
                </h2>
                <div className="space-y-2">
                  {data.samples.bookings.map((booking: any) => (
                    <div
                      key={booking.id}
                      className="flex justify-between text-sm p-2 bg-gray-700 rounded"
                    >
                      <span>
                        {booking.booking_type} - {booking.booking_date}
                      </span>
                      <span className="text-gray-400">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={checkStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Data
              </button>
              <Link
                href="/settings/migrations/status"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Back to Migration Status
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <h2 className="text-xl font-semibold text-red-400">Error</h2>
            </div>
            <p>{data?.error || "Failed to load data"}</p>
          </div>
        )}

        {/* Raw Data for Debugging */}
        <details className="mt-8">
          <summary className="cursor-pointer text-gray-400 hover:text-white">
            View Raw Response
          </summary>
          <pre className="mt-4 p-4 bg-gray-800 rounded text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
