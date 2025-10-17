"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, Key, AlertCircle } from "lucide-react";
import { Suspense } from "react";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const token = searchParams.get("invitation");

    if (error === "owners_not_allowed") {
      setMessage(
        "This portal is for gym members only. Gym owners should use login.gymleadhub.co.uk",
      );
      setSuccess(false);
    } else if (error === "auth_failed") {
      setMessage("Authentication failed. Please try again.");
      setSuccess(false);
    }

    // If invitation token in URL, redirect to claim page
    if (token) {
      router.push(`/claim/${token}`);
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Try direct Supabase auth first
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (authData?.session) {
        // Direct auth successful!
        console.log("Direct auth successful");
        setSuccess(true);
        setMessage("Login successful! Redirecting...");
        
        // Redirect immediately
        setTimeout(() => {
          window.location.href = "/client/dashboard";
        }, 500);
        return;
      }

      // Fallback to API if direct auth fails
      const response = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if user needs to set up password
        if (data.needsSetup && data.invitationToken) {
          setMessage(
            "Please use your invitation link to set up your password first.",
          );
          // Optionally redirect to claim page
          setTimeout(() => {
            router.push(`/claim/${data.invitationToken}`);
          }, 2000);
        } else {
          setMessage(data.error || "Login failed");
        }
        setSuccess(false);
        return;
      }

      // Handle successful login
      setSuccess(true);
      setMessage("Login successful! Redirecting...");
      
      console.log("Login response:", data);

      // If we have an auth URL, use it
      if (data.authUrl) {
        console.log("Using authUrl redirect:", data.authUrl);
        window.location.href = data.authUrl;
        return;
      }

      // If we have session tokens, set them
      if (data.session) {
        console.log("Setting session with tokens");
        const supabase = createClient();

        // Set new session (don't clear existing first, as it might remove server cookies)
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          console.error("Failed to set session:", sessionError);
          // Still try to redirect - the server might have set the session
          window.location.href = "/client/dashboard";
          return;
        }

        // Verify the session was set
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Session user after setting:", user?.email);

        console.log("Session set successfully, redirecting to:", data.redirectTo || "/client/dashboard");
        // Small delay to ensure cookies are set
        setTimeout(() => {
          window.location.href = data.redirectTo || "/client/dashboard";
        }, 100);
      } else {
        // Fallback redirect - trust the server set the session
        console.log("No session data returned, but login was successful - redirecting");
        // Small delay to ensure server cookies are set
        setTimeout(() => {
          window.location.href = "/client/dashboard";
        }, 100);
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage(err instanceof Error ? err.message : "Login failed");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mx-auto flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Sign in to access your member portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${
                success
                  ? "bg-green-900/30 border border-green-600 text-green-400"
                  : "bg-red-900/30 border border-red-600 text-red-400"
              }`}
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-700 pt-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">First time here?</p>
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <Key className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-gray-300 text-sm mb-2">
                Check your email for your invitation link
              </p>
              <p className="text-gray-500 text-xs">
                Your gym will send you a unique link to set up your password
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            Gym owner?{" "}
            <a
              href="https://login.gymleadhub.co.uk"
              className="text-orange-500 hover:text-orange-400"
            >
              Use the owner portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SimpleLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
