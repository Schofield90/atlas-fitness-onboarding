"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginTestPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Direct API call to test authentication
      const response = await fetch("/api/auth/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Owner Login Test
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Testing authentication flow
          </p>
        </div>

        <form
          className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="sam@atlas-gyms.co.uk"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter password"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded ${message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Login"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          <p>Test credentials:</p>
          <p>Email: sam@atlas-gyms.co.uk</p>
          <p>Password: Gyms2020!</p>
        </div>
      </div>
    </div>
  );
}
