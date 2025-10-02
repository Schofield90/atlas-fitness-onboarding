"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function AdminStripePage() {
  const [connected, setConnected] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/refresh params
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") === "true") {
      setSuccess("Stripe account connected successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stripe/status");
      const data = await response.json();

      if (response.ok && data.connected) {
        setConnected(true);
        setAccountStatus(data.account);
      }
    } catch (err: any) {
      console.error("Error checking connection:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      const response = await fetch("/api/admin/stripe/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection");
      }

      // Redirect to Stripe OAuth
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Stripe account?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/stripe/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setConnected(false);
      setAccountStatus(null);
      setSuccess("Stripe account disconnected");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Stripe Configuration
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect your Stripe account for platform billing and subscription
          management
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      ) : connected ? (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Stripe Connected
                </h3>
                <p className="text-sm text-gray-500">
                  Your Stripe account is connected and ready to process payments
                </p>
              </div>
            </div>

            {accountStatus && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Account ID</p>
                  <p className="text-sm font-medium text-gray-900">
                    {accountStatus.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Country</p>
                  <p className="text-sm font-medium text-gray-900">
                    {accountStatus.country}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Currency</p>
                  <p className="text-sm font-medium text-gray-900">
                    {accountStatus.default_currency?.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {accountStatus.email || "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Open Stripe Dashboard
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connect Your Stripe Account
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Connect your Stripe account to start accepting subscription
              payments from gym owners. We'll securely connect your account via
              Stripe OAuth.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Connect Stripe Account
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Platform Billing
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              This is your platform's Stripe account for charging gym owners
              their monthly subscriptions. This is separate from individual gym
              Stripe Connect accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
