"use client";

// Updated: Fri 3 Oct 2025 14:35 - Dual option UI with API key flow v2
import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  ExternalLink,
} from "lucide-react";
import SettingsHeader from "@/app/components/settings/SettingsHeader";

export default function PaymentIntegrationPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showConnectionOptions, setShowConnectionOptions] = useState(false);
  const [showApiKeyEntry, setShowApiKeyEntry] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testingApiKey, setTestingApiKey] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check for Stripe success/refresh params
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccessMessage("Stripe account connected successfully!");
      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("refresh") === "true") {
      // User needs to complete onboarding
      handleRefreshOnboarding();
      return;
    }

    fetchSettings();
    checkStripeConnection();
  }, []);

  const fetchSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userOrg) return;

      // Get payment settings
      const { data: paymentSettings } = await supabase
        .from("organization_payment_settings")
        .select("*")
        .eq("organization_id", userOrg.organization_id)
        .single();

      if (paymentSettings) {
        setSettings(paymentSettings);
        setConnected(!!paymentSettings.stripe_account_id);
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          payment_provider: "stripe",
          enabled: false,
          currency: "gbp",
          tax_rate: 20,
          payment_methods: ["card"],
          webhook_endpoint: `${window.location.origin}/api/webhooks/stripe`,
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkStripeConnection = async () => {
    try {
      console.log("🔍 Checking Stripe connection status...");
      const response = await fetch("/api/gym/stripe-connect/status");
      console.log("📡 Status response:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Status data:", data);
        setAccountStatus(data);
        setConnected(data.connected);
      } else {
        const errorText = await response.text();
        console.error("❌ Status check failed:", response.status, errorText);
      }
    } catch (error) {
      console.error("💥 Error checking Stripe connection:", error);
    }
  };

  const handleConnectStripe = async () => {
    try {
      const response = await fetch("/api/gym/stripe-connect/connect");

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          console.error("No URL in response:", data);
          alert("Failed to get Stripe onboarding URL");
        }
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Stripe Connect error:", errorData);
        alert(errorData?.error || "Failed to start Stripe Connect onboarding");
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      alert(
        "Failed to connect Stripe account. Please check your internet connection and try again.",
      );
    }
  };

  const handleRefreshOnboarding = async () => {
    try {
      const response = await fetch("/api/gym/stripe-connect/refresh");

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error("Error refreshing onboarding:", error);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      // Use Stripe's Express Dashboard link
      if (accountStatus?.account?.id) {
        window.open(
          `https://dashboard.stripe.com/${accountStatus.account.id}`,
          "_blank",
        );
      }
    } catch (error) {
      console.error("Error opening dashboard:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Stripe account?")) {
      return;
    }

    try {
      const response = await fetch("/api/gym/stripe-connect/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setConnected(false);
        setAccountStatus(null);
        alert("Stripe account disconnected successfully");
        window.location.reload();
      } else {
        alert("Failed to disconnect Stripe account");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert("Failed to disconnect Stripe account");
    }
  };

  const handleConnectExisting = async () => {
    setTestingApiKey(true);
    try {
      const response = await fetch("/api/gym/stripe-connect/connect-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      // Check if response has content before parsing JSON
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response body:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", responseText);
        alert(
          `Server error: Received invalid response. Check console for details.`,
        );
        return;
      }

      if (response.ok) {
        setConnected(true);
        setShowApiKeyEntry(false);
        setShowConnectionOptions(false);
        setSuccessMessage("Stripe account connected successfully!");
        setAccountStatus(data.account);
        console.log("✅ Connection successful! Account data:", data.account);
        alert(
          "Success! Check console for details. Refresh page manually to see connected state.",
        );
        // Reload page to show connected state
        // setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorMsg = data.error || "Failed to connect Stripe account";
        console.error(
          "Connection failed:",
          errorMsg,
          "Status:",
          response.status,
        );
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error("Error connecting existing account:", error);
      alert(`Network error: ${error.message || "Failed to connect to server"}`);
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        enabled: settings.enabled,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
        payment_methods: settings.payment_methods,
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from("organization_payment_settings")
          .update(updates)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("organization_payment_settings")
          .insert({ ...settings, ...updates });

        if (error) throw error;
        await fetchSettings();
      }
    } catch (error) {
      console.error("Error saving payment settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Payment Processing"
        description="Accept payments from your customers with Stripe"
        icon={<CreditCard className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving || !connected}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Save Changes
          </button>
        }
      />

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-green-400">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Stripe Connect Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Stripe Account Status
          </h3>
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not Connected</span>
              </>
            )}
          </div>
        </div>

        {!connected ? (
          <div>
            <p className="text-gray-400 text-sm mb-6">
              Choose how you want to connect Stripe to accept payments from your
              customers
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing Account Option */}
              <div className="p-6 border-2 border-blue-600 rounded-lg bg-gray-700/50">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  Connect Existing Account
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  Best for: Gyms switching from GoTeamUp or other platforms
                </p>
                <ul className="text-gray-300 text-xs space-y-1 mb-4">
                  <li>✓ Keep all existing customers & payment data</li>
                  <li>✓ No customer action required</li>
                  <li>✓ Takes 30 seconds to connect</li>
                </ul>
                <button
                  onClick={() => setShowApiKeyEntry(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Connect Current Account
                </button>
              </div>

              {/* New Account Option */}
              <div className="p-6 border-2 border-gray-600 rounded-lg bg-gray-700/30">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create New Account
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  Best for: New gyms without existing Stripe
                </p>
                <ul className="text-gray-300 text-xs space-y-1 mb-4">
                  <li>• Fresh start with new account</li>
                  <li>• Customers enter payment details</li>
                  <li>• Full Stripe Express setup</li>
                </ul>
                <button
                  onClick={handleConnectStripe}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Create New Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">
                Your Stripe account is connected and ready to accept payments
              </p>
              {connected && accountStatus?.account && (
                <div className="mt-2 space-y-1">
                  {!accountStatus.account.details_submitted && (
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Onboarding incomplete - Complete setup to enable
                      payments
                    </p>
                  )}
                  {!accountStatus.account.charges_enabled && (
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Charges not enabled - Complete verification to accept
                      payments
                    </p>
                  )}
                  {!accountStatus.account.payouts_enabled && (
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Payouts not enabled - Complete verification to receive
                      payouts
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {connected &&
              accountStatus?.account &&
              !accountStatus.account.details_submitted ? (
                <button
                  onClick={handleRefreshOnboarding}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Complete Onboarding
                </button>
              ) : null}
              <button
                onClick={handleOpenDashboard}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Open Stripe Dashboard
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Options Modal */}
      {showConnectionOptions && !connected && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Choose Connection Method
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Account Option */}
            <button
              onClick={() => {
                setShowConnectionOptions(false);
                setShowApiKeyEntry(true);
              }}
              className="p-6 border-2 border-blue-600 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <h4 className="text-white font-semibold mb-2">
                ✅ Connect Existing Account (Recommended)
              </h4>
              <p className="text-gray-400 text-sm">
                Connect your existing Stripe account with all your customers and
                payment data intact. No customer action required.
              </p>
            </button>

            {/* New Account Option */}
            <button
              onClick={() => {
                setShowConnectionOptions(false);
                handleConnectStripe();
              }}
              className="p-6 border-2 border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <h4 className="text-white font-semibold mb-2">
                🆕 Create New Account
              </h4>
              <p className="text-gray-400 text-sm">
                Create a new Stripe Express account. All customers will need to
                re-enter payment details.
              </p>
            </button>
          </div>
          <button
            onClick={() => setShowConnectionOptions(false)}
            className="mt-4 text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* API Key Entry */}
      {showApiKeyEntry && !connected && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Connect Your Existing Stripe Account
          </h3>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Step-by-Step Instructions
            </h4>
            <ol className="space-y-3 text-gray-300 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="font-medium">Open your Stripe Dashboard</p>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    Go to Stripe API Keys <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="font-medium">Create a new Secret key</p>
                  <p className="text-gray-400 mt-1">
                    Click{" "}
                    <span className="bg-gray-700 px-2 py-0.5 rounded font-medium">
                      + Create secret key
                    </span>{" "}
                    button in the top right
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="font-medium">Name your key and create</p>
                  <p className="text-gray-400 mt-1">
                    Give it a name like "Atlas Fitness CRM" and click Create
                  </p>
                  <div className="mt-2 space-y-2">
                    <p className="text-yellow-400 text-xs flex items-start gap-1">
                      <svg
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span>
                        <strong>Important:</strong> Select "Building your own
                        integration" - NOT "3rd party"
                      </span>
                    </p>
                    <p className="text-blue-400 text-xs flex items-start gap-1">
                      <svg
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Stripe will warn about full access - this is normal and
                        secure. Your key is encrypted and stored safely in our
                        system.
                      </span>
                    </p>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </span>
                <div>
                  <p className="font-medium">Copy your new key</p>
                  <p className="text-gray-400 mt-1">
                    Copy the key that starts with{" "}
                    <code className="bg-gray-700 px-1 rounded">sk_live_</code>{" "}
                    or{" "}
                    <code className="bg-gray-700 px-1 rounded">sk_test_</code>
                  </p>
                  <p className="text-yellow-400 text-xs mt-2 flex items-start gap-1">
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>
                      Important: This key will only be shown once. Keep it safe!
                    </span>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  5
                </span>
                <div>
                  <p className="font-medium">
                    Paste it below and click Connect
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Stripe Secret Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_... or sk_test_..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              🔒 Your API key is encrypted and stored securely. We never share
              it with third parties.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConnectExisting}
              disabled={!apiKey || testingApiKey}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testingApiKey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Account"
              )}
            </button>
            <button
              onClick={() => {
                setShowApiKeyEntry(false);
                setApiKey("");
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {connected && (
        <>
          {/* Webhook Configuration */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Webhook Configuration
            </h3>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Webhook Endpoint URL</p>
              <code className="text-xs text-gray-300 break-all">
                {settings?.webhook_endpoint}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Configure this URL in your Stripe webhook settings to receive
                payment events
              </p>
            </div>
          </div>
        </>
      )}

      {/* Platform Fee Notice */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">
          Platform Fees
        </h4>
        <p className="text-xs text-gray-500">
          Atlas Fitness charges a 3% platform fee on all transactions processed
          through your account. This fee is automatically deducted from each
          payment.
        </p>
      </div>
    </div>
  );
}
