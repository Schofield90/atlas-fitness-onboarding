"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QuickLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkCurrentSession();
  }, []);

  const checkCurrentSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const quickLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // First, clear any existing session
      await supabase.auth.signOut();

      // Then sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "sam@atlasfitness.com",
        password: "password123",
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Verify the session was created
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Failed to create session");
        return;
      }

      // Force a hard refresh to ensure all auth state is updated
      window.location.href = "/automations";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Quick Login
        </h1>

        {currentUser && (
          <div className="bg-green-500/10 border border-green-500 rounded p-3 mb-4">
            <p className="text-green-400 text-sm">
              Already logged in as: {currentUser.email}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={quickLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login as sam@atlasfitness.com"}
        </button>

        <button
          onClick={logout}
          className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors"
        >
          Logout
        </button>

        <div className="mt-6 space-y-2">
          <Link
            href="/automations"
            className="block text-center text-blue-400 hover:text-blue-300"
          >
            Go to Automations →
          </Link>
          <Link
            href="/automations/builder"
            className="block text-center text-blue-400 hover:text-blue-300"
          >
            Go to Workflow Builder →
          </Link>
          <Link
            href="/dashboard"
            className="block text-center text-blue-400 hover:text-blue-300"
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
