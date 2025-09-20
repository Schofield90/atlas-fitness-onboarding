"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Globe,
  Bell,
  Database,
  Mail,
  Palette,
  Users,
  Shield,
  Zap,
  Save,
  RefreshCw,
} from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    contact_email: "",
    timezone: "UTC",
    language: "en",
  });

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Zap },
    { id: "email", label: "Email", icon: Mail },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "system", label: "System", icon: Database },
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Failed to load settings");
        }
        if (isMounted && json.settings) {
          setForm({
            business_name: json.settings.business_name || "",
            contact_email: json.settings.contact_email || "",
            timezone: json.settings.timezone || "UTC",
            language: json.settings.language || "en",
          });
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load settings");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name,
          contact_email: form.contact_email,
          timezone: form.timezone,
          language: form.language,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to save settings");
      }
      setMessage("Settings saved successfully");
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const GeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Platform Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform Name
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, business_name: e.target.value }))
              }
              disabled={isLoading || isSaving}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Support Email
            </label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact_email: e.target.value }))
              }
              disabled={isLoading || isSaving}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Timezone
            </label>
            <select
              value={form.timezone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, timezone: e.target.value }))
              }
              disabled={isLoading || isSaving}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Language
            </label>
            <select
              value={form.language}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, language: e.target.value }))
              }
              disabled={isLoading || isSaving}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Registration Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <span className="text-gray-300">
              Allow new organization registration
            </span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <span className="text-gray-300">Require email verification</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <span className="text-gray-300">
              Auto-approve new organizations
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />;
      case "notifications":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Notification Settings
            </h3>
            <p className="text-gray-400">
              Configure system notifications, alerts, and communication
              preferences.
            </p>
            <div className="mt-6 space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-300">
                  Send admin alerts via email
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-300">
                  Notify on new organization registrations
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-300">Daily summary reports</span>
              </label>
            </div>
          </div>
        );
      case "integrations":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Integration Settings</h3>
            <p className="text-gray-400">
              Manage third-party integrations and API configurations.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">Stripe Payment Gateway</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Process payments and subscriptions
                </p>
                <button
                  onClick={() => router.push("/settings/integrations/payments")}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  Configure
                </button>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-2">Email Service</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Transactional email delivery
                </p>
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm">
                  Setup
                </button>
              </div>
            </div>
          </div>
        );
      case "email":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Email Configuration</h3>
            <p className="text-gray-400">
              Configure SMTP settings and email templates.
            </p>
          </div>
        );
      case "appearance":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Appearance Settings</h3>
            <p className="text-gray-400">
              Customize the look and feel of the admin interface.
            </p>
          </div>
        );
      case "system":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
            <p className="text-gray-400">
              Database settings, caching, and system optimization.
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium">Database Maintenance</h4>
                  <p className="text-sm text-gray-400">
                    Optimize database performance
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Run Maintenance
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">
              Admin Settings
            </h1>
            <p className="text-sm text-gray-400">
              Configure platform settings and preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && (
          <div className="mb-4 text-sm text-gray-400">Loading settings…</div>
        )}
        {message && (
          <div className="mb-4 text-sm text-green-400">{message}</div>
        )}
        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
        {renderTabContent()}
      </div>
    </div>
  );
}
