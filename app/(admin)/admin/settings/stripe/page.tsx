"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export default function AdminStripePage() {
  const [settings, setSettings] = useState({
    stripe_publishable_key: "",
    stripe_secret_key: "",
    stripe_webhook_secret: "",
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stripe/settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load settings");
      }

      setSettings({
        stripe_publishable_key: data.settings?.stripe_publishable_key || "",
        stripe_secret_key: data.settings?.stripe_secret_key || "",
        stripe_webhook_secret: data.settings?.stripe_webhook_secret || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/stripe/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess("Stripe settings saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/stripe/test");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      setSuccess("Stripe connection successful!");
      setTimeout(() => setSuccess(null), 3000);
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
          Configure Stripe for platform billing and subscription management
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Platform Billing Keys
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              These are your platform's main Stripe keys for charging gym owners
              for subscriptions. Get your keys from{" "}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                Stripe Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publishable Key
            </label>
            <input
              type="text"
              value={settings.stripe_publishable_key}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  stripe_publishable_key: e.target.value,
                }))
              }
              disabled={loading}
              placeholder="pk_live_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Starts with pk_live_ or pk_test_
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                value={settings.stripe_secret_key}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    stripe_secret_key: e.target.value,
                  }))
                }
                disabled={loading}
                placeholder="sk_live_..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Starts with sk_live_ or sk_test_
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Secret
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? "text" : "password"}
                value={settings.stripe_webhook_secret}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    stripe_webhook_secret: e.target.value,
                  }))
                }
                disabled={loading}
                placeholder="whsec_..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showWebhookSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Webhook endpoint:
              https://admin.gymleadhub.co.uk/api/webhooks/stripe
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={testConnection}
            disabled={loading || !settings.stripe_secret_key}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Next Steps</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
          <li>Enter your Stripe API keys above</li>
          <li>Set up webhook endpoint in Stripe Dashboard</li>
          <li>Test the connection</li>
          <li>Create subscription plans in the Plans page</li>
          <li>Sync plans with Stripe</li>
        </ol>
      </div>
    </div>
  );
}
