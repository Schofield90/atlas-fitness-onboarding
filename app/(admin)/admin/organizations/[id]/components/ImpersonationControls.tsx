"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

interface ImpersonationControlsProps {
  organizationId: string;
  organizationName: string;
}

export default function ImpersonationControls({
  organizationId,
  organizationName,
}: ImpersonationControlsProps) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [duration, setDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImpersonate = async () => {
    if (!reason) {
      alert("Please provide a reason for impersonation");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          scope,
          reason,
          durationMinutes: duration,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to organization dashboard
        router.push(`/dashboard?org=${organizationId}`);
      } else {
        alert(data.error || "Failed to start impersonation");
      }
    } catch (error) {
      console.error("Impersonation error:", error);
      alert("Failed to start impersonation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Admin Actions</h2>
            <p className="text-sm text-gray-500 mt-1">
              Perform administrative actions on this organization
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            <ShieldCheckIcon className="h-5 w-5 mr-2" />
            Impersonate Organization
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Impersonate {organizationName}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Access
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="e.g., Investigating billing issue reported by customer..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "read" | "write")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="read">Read Only (View data)</option>
                  <option value="write">Read/Write (Make changes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> All actions will be logged and
                  audited. This session will automatically expire after the
                  selected duration.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                disabled={loading}
              >
                {loading ? "Starting..." : "Start Impersonation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
