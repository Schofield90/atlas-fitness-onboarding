"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TEMPORARY EMERGENCY LOGIN PAGE - REMOVE AFTER FIXING AUTH
export default function EmergencyAdminLogin() {
  const [email, setEmail] = useState("sam@gymleadhub.co.uk");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/emergency-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to admin dashboard
        window.location.href = "/admin/dashboard";
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Emergency login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p className="font-bold">⚠️ Emergency Admin Login</p>
          <p className="text-sm">
            Supabase Auth is having issues. This is a temporary bypass.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Emergency Login"}
          </button>
        </form>

        <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded text-sm">
          <p>This page should be removed once Supabase Auth is fixed.</p>
        </div>
      </div>
    </div>
  );
}
