"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSessionClient } from "@/app/lib/supabase/client-with-session";
import { User } from "@supabase/supabase-js";

export default function TestAuthSimple() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const supabase = createSessionClient();
      if (!supabase) {
        setError("Supabase client not available");
        setLoading(false);
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        setError(error.message);
      } else {
        setUser(user);
      }
    } catch (err: any) {
      console.error("Check user error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const supabase = createSessionClient();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        setLoginForm({ email: "", password: "" });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createSessionClient();
      if (!supabase) return;

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Auth Test</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {user ? (
          <div className="bg-green-500/20 border border-green-500 rounded p-6">
            <h2 className="text-xl mb-4">Authenticated User</h2>
            <div className="space-y-2 mb-6">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
              <p><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded p-6">
            <h2 className="text-xl mb-4">Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded"
              >
                {loginLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
            <div className="mt-4 text-sm text-gray-400">
              <p>Test credentials: sam@atlas-gyms.co.uk / @Aa80236661</p>
            </div>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-400">
          <button
            onClick={checkUser}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded mr-4"
          >
            Refresh User Status
          </button>
          <Link
            href="/owner-login"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Go to Owner Login
          </Link>
        </div>
      </div>
    </div>
  );
}