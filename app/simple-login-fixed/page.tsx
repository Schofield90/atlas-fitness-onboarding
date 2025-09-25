"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Loader2, Key } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function SimpleLoginFixedPage() {
  const [step, setStep] = useState<"options" | "otp-email" | "otp-verify">(
    "options",
  );
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    console.log("handleSendOTP called with email:", email);
    setLoading(true);
    setMessage("");

    try {
      console.log("Sending OTP request...");
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

      console.log("OTP sent successfully, switching to verify step");
      setStep("otp-verify");
      setMessage("");
    } catch (err) {
      console.error("Error sending OTP:", err);
      setMessage(err instanceof Error ? err.message : "Failed to send OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    console.log("Verifying OTP:", otp);
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
      console.log("Verify response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      // Set session if we have tokens
      if (data.session) {
        try {
          const supabase = createClient();

          // Clear existing session first
          await supabase.auth.signOut({ scope: "local" });

          // Set new session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error("Failed to set session:", sessionError);
            throw new Error("Failed to establish session");
          }

          console.log("Session set successfully");
          setMessage("Login successful! Redirecting...");
          setSuccess(true);

          // Delay redirect to show success message
          setTimeout(() => {
            router.push("/client/dashboard");
          }, 1500);
        } catch (sessionErr) {
          console.error("Session setup error:", sessionErr);
          throw sessionErr;
        }
      } else {
        setMessage("Login successful! Redirecting...");
        setSuccess(true);
        setTimeout(() => {
          router.push("/client/dashboard");
        }, 1500);
      }
    } catch (err) {
      console.error("Verify error:", err);
      setMessage(err instanceof Error ? err.message : "Invalid or expired OTP");
      setSuccess(false);
    } finally {
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

      setMessage("New code sent to your email");
      setSuccess(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to resend OTP");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Main Login Options */}
        {step === "options" && (
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
                Welcome Back
              </h1>
              <p className="text-gray-300">
                Sign in to access your member portal
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep("otp-email")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg"
                type="button"
              >
                <Mail className="w-5 h-5" />
                Sign in with Email Code
              </button>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg ${success ? "bg-green-900/30 border border-green-600 text-green-400" : "bg-red-900/30 border border-red-600 text-red-400"}`}
              >
                {message}
              </div>
            )}
          </div>
        )}

        {/* OTP Email Step */}
        {step === "otp-email" && (
          <div>
            <button
              onClick={() => setStep("options")}
              className="inline-flex items-center text-gray-400 hover:text-orange-500 mb-6 transition-colors"
              type="button"
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
                  "Send Verification Code"
                )}
              </button>
            </div>
          </div>
        )}

        {/* OTP Verify Step */}
        {step === "otp-verify" && (
          <div>
            <button
              onClick={() => {
                setStep("otp-email");
                setOtp("");
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

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-orange-500 hover:text-orange-400 font-medium py-2 transition-colors"
              >
                Resend Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
