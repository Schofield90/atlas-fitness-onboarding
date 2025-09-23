"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Lock, Loader2, Key } from "lucide-react";
import { Suspense } from "react";
import {
  getPostAuthRedirectUrl,
  extractSubdomain,
} from "@/app/lib/auth/domain-redirects";

function LoginPageContent() {
  const [step, setStep] = useState<
    "options" | "otp-email" | "otp-verify" | "password"
  >("options");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "account_not_found") {
      setMessage(
        "Account not found. Only existing members can sign in with Google.",
      );
      setSuccess(false);
    } else if (error === "auth_failed") {
      setMessage("Authentication failed. Please try again.");
      setSuccess(false);
    }
  }, [searchParams]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setStep("otp-verify");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if we're on mobile for better debugging
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log(
      "OTP verification attempt from:",
      isMobile ? "Mobile" : "Desktop",
      {
        email: email.toLowerCase().trim(),
        otpLength: otp.length,
        device: navigator.userAgent,
      },
    );

    setLoading(true);
    setMessage("");

    // Add a timeout to prevent infinite loading (longer for mobile)
    const timeoutId = setTimeout(
      () => {
        setLoading(false);
        setMessage("Request timed out. Please try again.");
        setSuccess(false);
      },
      isMobile ? 45000 : 30000,
    ); // 45 seconds for mobile, 30 for desktop

    try {
      const response = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.toLowerCase().trim(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      // If we have session tokens, set them and redirect
      if (data.session) {
        try {
          const supabase = createClient();

          // Clear any existing session first to prevent conflicts
          await supabase.auth.signOut({ scope: "local" });

          // Set the new session - this supports multiple concurrent sessions
          const { data: sessionResult, error: sessionError } =
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });

          if (sessionError) {
            console.error("Failed to set session:", sessionError);
            console.error("Session error details:", {
              message: sessionError.message,
              session_method: data.sessionMethod,
              has_authUrl: !!data.authUrl,
            });

            // Try authUrl fallback if available
            if (data.authUrl) {
              console.log("Using auth URL fallback for multi-device support");
              window.location.href = data.authUrl;
              return;
            }
            throw new Error("Failed to set session. Please try again.");
          }

          // Verify session was set correctly
          if (!sessionResult?.session) {
            console.error("Session was not properly established");
            if (data.authUrl) {
              console.log(
                "Using auth URL fallback due to session verification failure",
              );
              window.location.href = data.authUrl;
              return;
            }
            throw new Error("Session verification failed. Please try again.");
          }

          // Log successful multi-device session setup
          console.log("Multi-device session established successfully:", {
            user_id: sessionResult.session.user.id,
            session_method: data.sessionMethod,
            expires_at: sessionResult.session.expires_at,
          });

          // Session set successfully, now confirm it and delete OTP
          if (data.otpRecordId) {
            try {
              await fetch("/api/login-otp/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otpRecordId: data.otpRecordId }),
              });
              console.log("Session confirmed and OTP cleaned up");
            } catch (confirmErr) {
              console.error("Failed to confirm session:", confirmErr);
              // Don't fail the login, OTP will expire naturally
            }
          }

          // Always redirect to client dashboard for members
          // Use full URL to ensure we stay on members subdomain
          const hostname =
            typeof window !== "undefined" ? window.location.hostname : "";

          clearTimeout(timeoutId); // Clear timeout on success

          if (hostname.includes("members.gymleadhub.co.uk")) {
            router.push("/client/dashboard");
          } else if (hostname.includes("gymleadhub.co.uk")) {
            // Redirect to members subdomain
            window.location.href =
              "https://members.gymleadhub.co.uk/client/dashboard";
          } else {
            // Local development
            router.push("/client/dashboard");
          }
        } catch (sessionErr) {
          console.error("Session setup error:", sessionErr);
          console.error("Multi-device session setup failed:", {
            error_message:
              sessionErr instanceof Error
                ? sessionErr.message
                : "Unknown error",
            session_method: data.sessionMethod,
            has_fallback: !!data.authUrl,
          });

          setMessage("Login failed. Please try again.");
          setSuccess(false);
          setLoading(false); // Stop the loading state
          return; // Don't continue
        }
      } else if (data.authUrl) {
        // Fallback to auth URL if provided
        window.location.href = data.authUrl;
      } else {
        // Use domain-aware redirect for members
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        const subdomain = extractSubdomain(hostname);

        // Force member role for simple-login (this is ALWAYS for members/clients)
        const userRole = data.userRole || "member";

        // If we're on members subdomain, stay there
        if (subdomain === "members") {
          router.push(data.redirectTo || "/client/dashboard");
        } else {
          // Redirect to the appropriate dashboard based on user role
          // Always use "member" role for simple-login to ensure correct redirect
          const redirectUrl = getPostAuthRedirectUrl(
            userRole,
            hostname,
            data.redirectTo,
          );
          if (redirectUrl.startsWith("http")) {
            window.location.href = redirectUrl;
          } else {
            router.push(redirectUrl);
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId); // Clear the timeout if we get here
      setMessage(err instanceof Error ? err.message : "Invalid or expired OTP");
      setSuccess(false);
    } finally {
      clearTimeout(timeoutId); // Clear the timeout
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      setMessage("New OTP sent to your email");
      setSuccess(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to resend OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to login");
      }

      // If we have an auth URL, use it to sign in
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        // Use domain-aware redirect
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        const subdomain = extractSubdomain(hostname);

        if (subdomain === "members") {
          router.push(data.redirectTo || "/client/dashboard");
        } else {
          // For localhost development, just use router.push
          if (hostname.includes("localhost")) {
            router.push(data.redirectTo || "/dashboard");
          } else {
            const redirectUrl = getPostAuthRedirectUrl(
              "member",
              hostname,
              data.redirectTo,
            );
            if (redirectUrl.startsWith("http")) {
              window.location.href = redirectUrl;
            } else {
              router.push(redirectUrl);
            }
          }
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      // Ensure members stay on members subdomain after OAuth
      const hostname =
        typeof window !== "undefined" ? window.location.hostname : "";
      const subdomain = extractSubdomain(hostname);
      const redirectPath =
        subdomain === "members" ? "/client/dashboard" : "/client";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectPath}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setMessage("Google login failed: " + error.message);
        setSuccess(false);
        setLoading(false);
      }
    } catch (error: any) {
      setMessage("Error: " + error.message);
      setSuccess(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full backdrop-blur-sm">
        {/* Main Login Options */}
        {step === "options" && (
          <>
            <div className="text-center mb-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mx-auto flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to GymLeadHub
              </h1>
              <p className="text-gray-300">
                Sign in to access your member portal
              </p>
            </div>

            {/* Login Options */}
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setStep("password")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
              >
                <Key className="w-5 h-5" />
                Sign in with Password
              </button>

              <button
                onClick={() => setStep("otp-email")}
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-orange-500 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                <Mail className="w-5 h-5" />
                Sign in with Email Code
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-900 text-gray-400">or</span>
              </div>
            </div>

            {/* Google Login Option */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-orange-500 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              {loading ? "Signing in..." : "Continue with Google"}
            </button>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  success
                    ? "bg-green-900/30 border border-green-600 text-green-400"
                    : "bg-red-900/30 border border-red-600 text-red-400"
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm">
                Only existing members can sign in. Don't have an account?{" "}
                <Link
                  href="/contact"
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Contact us
                </Link>
              </p>
            </div>
          </>
        )}

        {/* OTP Email Step */}
        {step === "otp-email" && (
          <>
            <button
              onClick={() => setStep("options")}
              className="inline-flex items-center text-gray-400 hover:text-orange-500 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login options
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                <Mail className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Enter Your Email
              </h1>
              <p className="text-gray-300 mt-2">
                We'll send you a secure code to sign in
              </p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-6">
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

              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    success
                      ? "bg-green-900/30 border border-green-600 text-green-400"
                      : "bg-red-900/30 border border-red-600 text-red-400"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>
          </>
        )}

        {/* OTP Verify Step */}
        {step === "otp-verify" && (
          <>
            <button
              onClick={() => setStep("otp-email")}
              className="inline-flex items-center text-gray-400 hover:text-orange-500 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change email
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <Lock className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Enter Verification Code
              </h1>
              <p className="text-gray-300 mt-2">
                We sent a 6-digit code to {email}
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest transition-all"
                  placeholder="000000"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    success
                      ? "bg-green-900/30 border border-green-600 text-green-400"
                      : "bg-red-900/30 border border-red-600 text-red-400"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-orange-500 hover:text-orange-400 font-medium py-2 transition-colors"
              >
                Resend Code
              </button>
            </form>
          </>
        )}

        {/* Password Step */}
        {step === "password" && (
          <>
            <button
              onClick={() => setStep("options")}
              className="inline-flex items-center text-gray-400 hover:text-orange-500 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login options
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                <Key className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Sign In with Password
              </h1>
              <p className="text-gray-300 mt-2">
                Enter your email and password to sign in
              </p>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="password-email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="password-email"
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
                  className={`p-3 rounded-lg ${
                    success
                      ? "bg-green-900/30 border border-green-600 text-green-400"
                      : "bg-red-900/30 border border-red-600 text-red-400"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("otp-email")}
                  className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
                >
                  Use email code instead
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function SimpleLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
