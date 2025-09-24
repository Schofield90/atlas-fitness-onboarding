"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function TestLogin() {
  const [email, setEmail] = useState("sam@gymleadhub.co.uk");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Try emergency auth endpoint first (handles both normal and emergency)
      const response = await fetch("/api/auth/emergency-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.isEmergencyMode) {
          setMessage(
            "⚠️ Using emergency auth (Supabase is down). Redirecting...",
          );
        } else {
          setMessage("Success! Redirecting...");
        }

        setTimeout(() => {
          // Store auth info for emergency dashboard
          if (result.isEmergencyMode) {
            localStorage.setItem(
              "emergency_auth",
              JSON.stringify({
                user_id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                expires: Date.now() + 24 * 60 * 60 * 1000,
              }),
            );
            window.location.href = "/dashboard-emergency";
          } else {
            window.location.href = "/dashboard";
          }
        }, 1500);
      } else {
        setMessage("Error: " + result.error);
      }
    } catch (err: any) {
      setMessage("Catch error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Test Login</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="w-full py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            onClick={() => {
              // Store auth bypass for testing
              localStorage.setItem(
                "test_user_id",
                "64cbbca2-a091-4bb6-99c2-5b8e90a31c4e",
              );
              localStorage.setItem("test_user_email", "sam@gymleadhub.co.uk");
              window.location.href = "/dashboard";
            }}
            className="w-full py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
          >
            Bypass Login (Go to Dashboard)
          </button>

          {message && (
            <div
              className={
                message.includes("Error")
                  ? "p-4 rounded-lg bg-red-900/20 text-red-400"
                  : "p-4 rounded-lg bg-green-900/20 text-green-400"
              }
            >
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            ← Back to normal login
          </Link>
        </div>
      </div>
    </div>
  );
}
