"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Account setup page to bypass organization creation
export default function SetupAccountPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  const handleSetup = async () => {
    setLoading(true);
    setMessage("Linking your account to Atlas Fitness...");

    try {
      const response = await fetch("/api/admin/link-sam-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setStats(result.data?.stats);
        setTimeout(() => {
          router.push(result.redirectTo || "/dashboard");
        }, 3000);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Setup error:", error);
      setMessage("Failed to link account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">
          Link to Atlas Fitness
        </h1>

        <p className="text-gray-400 mb-6">
          This will link your account to the existing Atlas Fitness organization
          with all its classes, memberships, and data.
        </p>

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Linking..." : "Link Account"}
        </button>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.includes("Error")
                ? "bg-red-900/50 text-red-300"
                : "bg-green-900/50 text-green-300"
            }`}
          >
            {message}

            {stats && (
              <div className="mt-3 text-sm">
                <p>Found existing data:</p>
                <ul className="mt-1 ml-4">
                  <li>• {stats.classes} classes in timetable</li>
                  <li>• {stats.memberships} active memberships</li>
                  <li>• {stats.userBookings} of your bookings</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-gray-500 text-sm mt-6">
          Note: You must be logged in as sam@atlas-gyms.co.uk for this to work.
        </p>
      </div>
    </div>
  );
}
