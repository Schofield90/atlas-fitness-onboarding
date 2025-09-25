"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimpleLoginDebugPage() {
  const [email, setEmail] = useState("samschofield90@hotmail.co.uk");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();

  const addLog = (log: string) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    setLogs((prev) => [...prev, `[${timestamp}] ${log}`]);
    console.log(`[DEBUG ${timestamp}] ${log}`);
  };

  useEffect(() => {
    addLog("Page mounted");

    // Intercept navigation attempts
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      addLog(`pushState attempted: ${args[2]}`);
      return originalPushState.apply(window.history, args as any);
    };

    window.history.replaceState = function (...args) {
      addLog(`replaceState attempted: ${args[2]}`);
      return originalReplaceState.apply(window.history, args as any);
    };

    // Listen for navigation events
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      addLog(`Page unloading! Target: ${(e as any).target?.location?.href}`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleSendOTP = async () => {
    addLog("handleSendOTP called");
    setLoading(true);
    setMessage("");

    try {
      addLog("Fetching /api/login-otp...");
      const response = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: email.toLowerCase().trim(),
        }),
      });

      addLog(`Response status: ${response.status}`);
      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data).substring(0, 100)}`);

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setMessage("OTP sent! Check your email.");
      addLog("OTP sent successfully");
      setStep("verify");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed";
      addLog(`Error: ${errorMsg}`);
      setMessage(errorMsg);
    } finally {
      setLoading(false);
      addLog("handleSendOTP completed");
    }
  };

  const handleVerifyOTP = async () => {
    addLog("handleVerifyOTP called");
    setLoading(true);
    setMessage("");

    try {
      addLog("Fetching /api/login-otp verify...");
      const response = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.toLowerCase().trim(),
          otp: otp.trim(),
        }),
      });

      addLog(`Verify response status: ${response.status}`);
      const data = await response.json();
      addLog(`Verify response data: ${JSON.stringify(data).substring(0, 100)}`);

      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      setMessage("Login successful! Redirecting in 10 seconds...");
      addLog("Login successful, redirecting in 10 seconds...");

      setTimeout(() => {
        addLog("Attempting redirect to /client/dashboard");
        router.push("/client/dashboard");
      }, 10000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed";
      addLog(`Verify error: ${errorMsg}`);
      setMessage(errorMsg);
    } finally {
      setLoading(false);
      addLog("handleVerifyOTP completed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-white mb-4">
        <h1 className="text-2xl font-bold mb-6">Login Debug Page</h1>

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
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 py-2 rounded disabled:opacity-50"
              type="button"
            >
              {loading ? "Sending..." : "Send OTP Code"}
            </button>
          </div>
        )}

        {step === "verify" && (
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
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-green-500 hover:bg-green-600 py-2 rounded disabled:opacity-50"
              type="button"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              onClick={() => {
                addLog("Back to email step");
                setStep("email");
                setOtp("");
              }}
              className="w-full text-gray-400 hover:text-white"
              type="button"
            >
              Back
            </button>
          </div>
        )}

        {message && (
          <div className="p-3 rounded bg-blue-900/30 text-blue-400 mt-4">
            {message}
          </div>
        )}
      </div>

      <div className="max-w-md w-full bg-gray-800 rounded-lg p-4 text-white">
        <h2 className="text-lg font-bold mb-2">Debug Logs</h2>
        <div className="bg-gray-900 rounded p-2 text-xs font-mono overflow-auto max-h-64">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-green-400">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
