"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SimpleTestPage() {
  const [email, setEmail] = useState("samschofield90@hotmail.co.uk");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [otp, setOtp] = useState("");
  const router = useRouter();

  const sendOTP = async () => {
    console.log("sendOTP called");
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
      console.log("Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setMessage("Code sent! Check your email.");
      setStep("code");
    } catch (err) {
      console.error("Error:", err);
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    console.log("verifyOTP called with:", otp);
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

      // Try to set session if we have tokens
      if (data.session) {
        setMessage("Login successful! Redirecting...");
        setTimeout(() => {
          router.push("/client/dashboard");
        }, 1000);
      } else {
        setMessage("Login successful but no session. Check console.");
      }
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
        <h1 className="text-2xl font-bold mb-6">Simple Login Test</h1>

        {step === "email" && (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded"
              placeholder="Email"
            />
            <button
              onClick={sendOTP}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Code sent to {email}</p>
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full px-3 py-2 bg-gray-700 rounded text-center text-2xl"
              placeholder="000000"
              maxLength={6}
            />
            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-500 hover:bg-green-600 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              onClick={() => setStep("email")}
              className="w-full text-gray-400 hover:text-white"
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

        <div className="mt-6 text-xs text-gray-400">
          This is a minimal test page. Check console for logs.
        </div>
      </div>
    </div>
  );
}
