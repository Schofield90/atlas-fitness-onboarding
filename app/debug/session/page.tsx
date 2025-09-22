"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  getCurrentSessionInfo,
  validateSessionWithServer,
  refreshSessionIfNeeded,
  logSessionInfo,
  type SessionInfo,
} from "@/app/lib/auth/multi-device-session";

/**
 * Debug page for multi-device session management
 * Only accessible in development or for debugging purposes
 */
export default function SessionDebugPage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [serverValidation, setServerValidation] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [refreshResult, setRefreshResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-refresh session info every 10 seconds
  useEffect(() => {
    const updateSessionInfo = async () => {
      const info = await getCurrentSessionInfo();
      setSessionInfo(info);
      logSessionInfo("debug-page");
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleValidateSession = async () => {
    setLoading(true);
    try {
      const result = await validateSessionWithServer();
      setServerValidation(result);
    } catch (error) {
      setServerValidation({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLoading(false);
  };

  const handleRefreshSession = async () => {
    setLoading(true);
    try {
      const result = await refreshSessionIfNeeded();
      setRefreshResult(result);

      // Update session info after refresh
      const info = await getCurrentSessionInfo();
      setSessionInfo(info);
    } catch (error) {
      setRefreshResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLoading(false);
  };

  const handleTestOTP = async () => {
    const email = prompt("Enter email for OTP test:");
    if (!email) return;

    setLoading(true);
    try {
      // Send OTP
      const sendResponse = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          email: email.toLowerCase().trim(),
        }),
      });

      const sendData = await sendResponse.json();
      if (!sendResponse.ok) {
        throw new Error(sendData.error || "Failed to send OTP");
      }

      const otp = prompt("Enter the OTP code:");
      if (!otp) return;

      // Verify OTP
      const verifyResponse = await fetch("/api/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.toLowerCase().trim(),
          otp: otp.trim(),
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Failed to verify OTP");
      }

      // If we have session tokens, set them
      if (verifyData.session) {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
        });

        if (sessionError) {
          throw new Error("Failed to set session: " + sessionError.message);
        }

        // Update session info
        const info = await getCurrentSessionInfo();
        setSessionInfo(info);
        alert("OTP login successful!");
      }
    } catch (error) {
      alert(
        "OTP test failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Update session info
    const info = await getCurrentSessionInfo();
    setSessionInfo(info);
  };

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            This debug page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Multi-Device Session Debug
        </h1>

        {/* Session Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Current Session Information
          </h2>
          {sessionInfo ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Status:</span>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    sessionInfo.isValid
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {sessionInfo.isValid ? "Valid" : "Invalid"}
                </span>
              </div>

              <div>
                <span className="font-medium">Session ID:</span>{" "}
                {sessionInfo.sessionId || "N/A"}
              </div>
              <div>
                <span className="font-medium">User ID:</span>{" "}
                {sessionInfo.userId || "N/A"}
              </div>
              <div>
                <span className="font-medium">Expires At:</span>{" "}
                {sessionInfo.expiresAt || "N/A"}
              </div>
              <div>
                <span className="font-medium">User Agent:</span>
                <span className="text-xs ml-2 break-all">
                  {sessionInfo.deviceInfo.userAgent.substring(0, 100)}...
                </span>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>{" "}
                {sessionInfo.deviceInfo.timestamp}
              </div>
              {sessionInfo.error && (
                <div className="text-red-600">
                  <span className="font-medium">Error:</span>{" "}
                  {sessionInfo.error}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Loading session information...</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Session Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleValidateSession}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Validate with Server
            </button>

            <button
              onClick={handleRefreshSession}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Refresh Session
            </button>

            <button
              onClick={handleTestOTP}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Test OTP Login
            </button>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Server Validation Results */}
        {serverValidation && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Server Validation Results
            </h2>
            <div
              className={`p-4 rounded-lg ${
                serverValidation.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <div className="font-medium">
                {serverValidation.success
                  ? "✅ Session Valid"
                  : "❌ Session Invalid"}
              </div>
              {serverValidation.error && (
                <div className="mt-2 text-sm">
                  Error: {serverValidation.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Results */}
        {refreshResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Session Refresh Results
            </h2>
            <div
              className={`p-4 rounded-lg ${
                refreshResult.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <div className="font-medium">
                {refreshResult.success
                  ? "✅ Refresh Successful"
                  : "❌ Refresh Failed"}
              </div>
              {refreshResult.error && (
                <div className="mt-2 text-sm">Error: {refreshResult.error}</div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Multi-Device Testing Instructions
          </h2>
          <div className="text-gray-600 space-y-2">
            <p>
              <strong>1.</strong> Open this page in multiple browser tabs or
              devices
            </p>
            <p>
              <strong>2.</strong> Use "Test OTP Login" to authenticate on each
              device
            </p>
            <p>
              <strong>3.</strong> Verify that sessions remain active on all
              devices
            </p>
            <p>
              <strong>4.</strong> Use "Validate with Server" to check
              server-side session status
            </p>
            <p>
              <strong>5.</strong> Monitor the session information for any
              conflicts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
