"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { Mail, Lock, Chrome, AlertCircle, Loader2 } from "lucide-react";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      if (!supabase) {
        console.error("Supabase client not initialized - likely SSR issue");
        setError(
          "Unable to connect to authentication service. Please refresh the page.",
        );
        setLoading(false);
        return;
      }

      console.log("Attempting login for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (data?.user) {
        console.log("Login successful for:", data.user.email);

        // Check if user has an organization (with better error handling)
        try {
          const { data: orgData, error: orgError } = await supabase
            .from("user_organizations")
            .select("organization_id, role")
            .eq("user_id", data.user.id)
            .single();

          if (
            !orgError &&
            orgData &&
            (orgData.role === "owner" || orgData.role === "admin")
          ) {
            console.log("User has organization with role:", orgData.role);
            router.push("/dashboard");
            return;
          }
        } catch (err) {
          console.log("Error checking user_organizations, continuing...");
        }

        // Check if they own an organization directly
        try {
          const { data: ownedOrg, error: ownedOrgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", data.user.id)
            .single();

          if (!ownedOrgError && ownedOrg) {
            console.log("User owns organization, redirecting to dashboard");
            router.push("/dashboard");
            return;
          }
        } catch (err) {
          console.log("Error checking owned organizations");
        }

        // If no organization found, still redirect to dashboard
        // The organization provider will handle the bypass
        console.log(
          "No organization found in login, but redirecting to dashboard anyway",
        );
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Unable to connect to authentication service");
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google login error:", error);
      setError("Failed to login with Google");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">GymLeadHub</h1>
          <p className="text-gray-400">Owner & Admin Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="owner@gymname.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-400">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex justify-center items-center px-4 py-3 border border-gray-600 rounded-lg text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            <Chrome className="w-5 h-5 mr-2" />
            Sign in with Google
          </button>

          {/* Links */}
          <div className="space-y-3 pt-4 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-orange-400 hover:text-orange-300"
              >
                Sign up
              </Link>
            </p>
            <p className="text-center text-sm text-gray-500">
              Client login?{" "}
              <Link
                href="/simple-login"
                className="text-blue-400 hover:text-blue-300"
              >
                Use client portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
