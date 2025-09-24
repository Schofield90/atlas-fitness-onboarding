"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EmergencyLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Direct check for sam@atlas-gyms.co.uk
    if (email === "sam@atlas-gyms.co.uk" && password === "Gyms2020!") {
      // Set emergency session in localStorage
      localStorage.setItem(
        "emergency_auth",
        JSON.stringify({
          email,
          id: "ea1fc8e3-35a2-4c59-80af-5fde557391a1",
          organizationId: "63589490-8f55-4157-bd3a-e141594b748e",
          timestamp: Date.now(),
        }),
      );

      // Set a cookie as well for middleware
      document.cookie = `emergency_auth=true; path=/; max-age=86400`;
      document.cookie = `emergency_user=sam@atlas-gyms.co.uk; path=/; max-age=86400`;

      alert("Emergency login successful! Redirecting to dashboard...");

      // Force redirect
      window.location.href = "/dashboard";
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Emergency Login (Bypass All Checks)
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          This bypasses all authentication and database checks
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Emergency Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
