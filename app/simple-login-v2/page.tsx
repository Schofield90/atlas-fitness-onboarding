"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SimpleLoginV2Page() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const sendOTP = async () => {
    console.log("sendOTP called - button click");
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
      console.log("OTP response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setMessage("Code sent! Check your email.");
      setStep("verify");
    } catch (err) {
      console.error("Error:", err);
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    console.log("verifyOTP called");
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

      setMessage("Login successful! Redirecting...");
      setTimeout(() => {
        router.push("/client/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Error:", err);
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-white">
        <h1 className="text-2xl font-bold mb-6">Simple Login V2</h1>

        {step === "email" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded"
                placeholder="your@email.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email) {
                    e.preventDefault();
                    sendOTP();
                  }
                }}
              />
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || !email}
              className="w-full bg-orange-500 hover:bg-orange-600 py-2 rounded disabled:opacity-50"
              type="button"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Code sent to {email}</p>

            <div>
              <label className="block text-sm mb-2">Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full px-3 py-2 bg-gray-700 rounded text-center text-2xl"
                placeholder="000000"
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otp.length === 6) {
                    e.preventDefault();
                    verifyOTP();
                  }
                }}
              />
            </div>

            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-500 hover:bg-green-600 py-2 rounded disabled:opacity-50"
              type="button"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              onClick={() => setStep("email")}
              className="w-full text-gray-400 hover:text-white"
              type="button"
            >
              Back
            </button>
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 rounded bg-blue-900/30 text-blue-400">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
