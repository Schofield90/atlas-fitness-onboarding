"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import Image from "next/image";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
        setLoading(false);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to sign in with Google");
      setIsError(true);
      setLoading(false);
    }
  };

  const handleEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage("Please enter your email address");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        setOtpSent(true);
        setMessage("Check your email for the login link!");
        setIsError(false);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to send login email");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Atlas Fitness</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Main Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-800/50 text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email OTP Form */}
          {!otpSent ? (
            <form onSubmit={handleEmailOTP} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    <span>Send Magic Link</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Check your email
              </h3>
              <p className="text-gray-400 mb-4">
                We've sent a magic link to
                <br />
                <span className="font-medium text-white">{email}</span>
              </p>
              <button
                onClick={() => {
                  setOtpSent(false);
                  setEmail("");
                  setMessage("");
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Use a different email
              </button>
            </div>
          )}

          {/* Error/Success Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                isError
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "bg-green-500/10 border border-green-500/20 text-green-400"
              }`}
            >
              {message}
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Privacy Policy / Terms */}
        <p className="mt-8 text-center text-xs text-gray-500">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-400">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-gray-400">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
