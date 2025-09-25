"use client";

import { useState } from "react";

export default function OTPTestPage() {
  const [email, setEmail] = useState("samschofield90@hotmail.co.uk");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with email:", email);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setMessage("OTP sent! Check your email.");
    } catch (err) {
      console.error("Error:", err);
      setMessage(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    console.log("Testing API directly...");
    try {
      const response = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: "samschofield90@hotmail.co.uk",
        }),
      });
      const data = await response.json();
      console.log("API Test Response:", data);
      setMessage(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("API Test Error:", err);
      setMessage(
        "API Error: " + (err instanceof Error ? err.message : "Unknown"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6">OTP Test Page</h1>

        <div className="mb-4">
          <button
            onClick={testAPI}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded mb-4"
          >
            Test API Directly
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="your@email.com"
              required
            />
          </div>

          {message && (
            <div className="p-3 rounded bg-blue-900/30 border border-blue-600 text-blue-400 whitespace-pre-wrap">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Code (Form Submit)"}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-400">
          Open browser console (F12) to see logs
        </div>
      </div>
    </div>
  );
}
