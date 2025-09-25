"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Loader2 } from "lucide-react";

export default function SimpleLoginV3Page() {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    console.log("Sending OTP to:", email);
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
      console.log("Send OTP response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setStep("verify");
      setMessage("Code sent! Check your email.");
      setSuccess(true);
    } catch (err) {
      console.error("Error sending OTP:", err);
      setMessage(err instanceof Error ? err.message : "Failed to send OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    console.log("Verifying OTP");
    setLoading(true);
    setMessage("");

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
      console.log("Verify OTP response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      // Server has already set cookies, we just need to redirect
      setMessage("Login successful! Redirecting...");
      setSuccess(true);

      // Check if we have an auth URL (fallback)
      if (data.authUrl) {
        console.log("Using auth URL for redirect");
        window.location.href = data.authUrl;
        return;
      }

      // If we have session tokens, try to use the set-session endpoint
      if (data.session) {
        console.log("Setting session via server endpoint");
        const setSessionResponse = await fetch("/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            redirect_to: data.redirectTo || "/client/dashboard",
          }),
        });

        const setSessionData = await setSessionResponse.json();

        if (setSessionData.success) {
          console.log("Session set successfully, redirecting...");
          // Give cookies time to propagate
          setTimeout(() => {
            router.push(data.redirectTo || "/client/dashboard");
          }, 500);
          return;
        }
      }

      // Direct redirect (cookies should already be set server-side)
      console.log("Redirecting to dashboard (cookies set server-side)");
      setTimeout(() => {
        router.push(data.redirectTo || "/client/dashboard");
      }, 500);
    } catch (err) {
      console.error("Verify error:", err);
      setMessage(err instanceof Error ? err.message : "Invalid or expired OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {step === "email" && (
          <div>
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

            <div className="space-y-6">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email) {
                      e.preventDefault();
                      handleSendOTP();
                    }
                  }}
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg ${success ? "bg-green-900/30 border border-green-600 text-green-400" : "bg-red-900/30 border border-red-600 text-red-400"}`}
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-105 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div>
            <button
              onClick={() => {
                setStep("email");
                setOtp("");
                setMessage("");
              }}
              className="inline-flex items-center text-gray-400 hover:text-orange-500 mb-6 transition-colors"
              type="button"
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

            <div className="space-y-6">
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
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otp.length === 6) {
                      e.preventDefault();
                      handleVerifyOTP();
                    }
                  }}
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg ${success ? "bg-green-900/30 border border-green-600 text-green-400" : "bg-red-900/30 border border-red-600 text-red-400"}`}
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyOTP}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
