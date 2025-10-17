"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Plus,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  Bot,
} from "lucide-react";

interface OrganizationSettings {
  id?: string;
  organization_id: string;
  default_greeting: string;
  voicemail_enabled: boolean;
  voicemail_message: string;
  business_hours: any;
  call_routing_type: string;
  call_timeout: number;
  record_calls: boolean;
  auto_response_enabled: boolean;
  auto_response_delay: number;
  sms_signature: string;
  whatsapp_business_hours_only: boolean;
  email_from_name: string;
  email_signature: string;
  email_reply_to: string;
  ai_enabled: boolean;
  ai_personality: string;
  ai_response_style: string;
}

interface Staff {
  id: string;
  user_id: string;
  phone_number: string;
  email: string;
  is_available: boolean;
  receives_calls: boolean;
  receives_sms: boolean;
  receives_whatsapp: boolean;
  receives_emails: boolean;
  routing_priority: number;
  role: string;
}

export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    email: "",
    phone_number: "",
    role: "staff",
  });
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
    fetchStaff();
  }, []);

  const fetchSettings = async () => {
    try {
      // Get user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      // Get or create settings
      let { data: settings } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .single();

      if (!settings) {
        // Create default settings
        const { data: newSettings } = await supabase
          .from("organization_settings")
          .insert({ organization_id: profile.organization_id })
          .select()
          .single();
        settings = newSettings;
      }

      setSettings(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      // TODO: organization_staff table doesn't exist, need to refactor
      // const { data } = await supabase
      //   .from('organization_staff')
      //   .select('*')
      //   .eq('organization_id', profile.organization_id)
      //   .order('routing_priority')

      setStaff([]);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organization_settings")
        .update(settings)
        .eq("id", settings.id);

      if (error) throw error;

      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addStaff = async () => {
    try {
      const response = await fetch("/api/organization/add-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaffData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add staff member");
      }

      // Refresh staff list
      fetchStaff();
      setShowAddStaff(false);
      setNewStaffData({ email: "", phone_number: "", role: "staff" });
      alert("Staff member added successfully!");
    } catch (error: any) {
      console.error("Error adding staff:", error);
      alert(error.message || "Failed to add staff member");
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      // TODO: organization_staff table doesn't exist
      // const { error } = await supabase
      //   .from('organization_staff')
      //   .delete()
      //   .eq('id', staffId)
      const error = new Error("Staff management is temporarily disabled");

      if (error) throw error;

      fetchStaff();
      alert("Staff member removed successfully!");
    } catch (error) {
      console.error("Error removing staff:", error);
      alert("Failed to remove staff member");
    }
  };

  const toggleStaffAvailability = async (
    staffId: string,
    currentStatus: boolean,
  ) => {
    try {
      // TODO: organization_staff table doesn't exist
      // const { error } = await supabase
      //   .from('organization_staff')
      //   .update({ is_available: !currentStatus })
      //   .eq('id', staffId)
      const error = new Error("Staff management is temporarily disabled");

      if (error) throw error;

      fetchStaff();
    } catch (error) {
      console.error("Error updating staff availability:", error);
      alert("Failed to update staff availability");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-400">Loading settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex space-x-8">
            {["general", "voice", "messaging", "ai", "staff"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-500"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === "general" && settings && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4">General Settings</h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Greeting
                </label>
                <input
                  type="text"
                  value={settings.default_greeting}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_greeting: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  placeholder="Thank you for calling"
                />
                <p className="text-xs text-gray-400 mt-1">
                  What callers hear when they call your number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email From Name
                </label>
                <input
                  type="text"
                  value={settings.email_from_name || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email_from_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  placeholder="Atlas Fitness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Reply-To
                </label>
                <input
                  type="email"
                  value={settings.email_reply_to || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email_reply_to: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  placeholder="info@atlasfitness.com"
                />
              </div>
            </div>
          )}

          {activeTab === "voice" && settings && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Phone className="w-6 h-6" />
                Voice Settings
              </h2>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Call Routing Type
                </label>
                <select
                  value={settings.call_routing_type}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      call_routing_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                >
                  <option value="single">Single (First Available)</option>
                  <option value="simultaneous">Simultaneous (Ring All)</option>
                  <option value="round-robin">Round Robin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Call Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.call_timeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      call_timeout: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  min="10"
                  max="60"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="record_calls"
                  checked={settings.record_calls}
                  onChange={(e) =>
                    setSettings({ ...settings, record_calls: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600"
                />
                <label htmlFor="record_calls">Record all calls</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="voicemail_enabled"
                  checked={settings.voicemail_enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      voicemail_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-600"
                />
                <label htmlFor="voicemail_enabled">Enable voicemail</label>
              </div>

              {settings.voicemail_enabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Voicemail Message
                  </label>
                  <textarea
                    value={settings.voicemail_message || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        voicemail_message: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg h-24"
                    placeholder="Sorry we missed your call. Please leave a message and we'll get back to you."
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "messaging" && settings && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Messaging Settings
              </h2>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_response"
                  checked={settings.auto_response_enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auto_response_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-600"
                />
                <label htmlFor="auto_response">Enable auto-response</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  SMS Signature
                </label>
                <input
                  type="text"
                  value={settings.sms_signature || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, sms_signature: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                  placeholder="- Atlas Fitness Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Signature
                </label>
                <textarea
                  value={settings.email_signature || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email_signature: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg h-32"
                  placeholder="Best regards,&#10;The Atlas Fitness Team"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="whatsapp_hours"
                  checked={settings.whatsapp_business_hours_only}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp_business_hours_only: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-600"
                />
                <label htmlFor="whatsapp_hours">
                  Only respond to WhatsApp during business hours
                </label>
              </div>
            </div>
          )}

          {activeTab === "ai" && settings && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bot className="w-6 h-6" />
                AI Assistant Settings
              </h2>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ai_enabled"
                  checked={settings.ai_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, ai_enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600"
                />
                <label htmlFor="ai_enabled">Enable AI assistant</label>
              </div>

              {settings.ai_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      AI Personality
                    </label>
                    <select
                      value={settings.ai_personality}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai_personality: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Response Style
                    </label>
                    <select
                      value={settings.ai_response_style}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai_response_style: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                    >
                      <option value="concise">Concise</option>
                      <option value="detailed">Detailed</option>
                      <option value="conversational">Conversational</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "staff" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Staff Members</h2>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Staff
                </button>
              </div>

              <div className="space-y-4">
                {staff.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No staff members added yet.</p>
                    <p className="text-sm mt-2">
                      Click "Add Staff" to add your first team member.
                    </p>
                  </div>
                )}
                {staff.map((member) => (
                  <div key={member.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{member.email}</h3>
                        <p className="text-sm text-gray-400">
                          {member.phone_number} • {member.role}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span
                            className={
                              member.receives_calls
                                ? "text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {member.receives_calls ? "✓" : "✗"} Calls
                          </span>
                          <span
                            className={
                              member.receives_sms
                                ? "text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {member.receives_sms ? "✓" : "✗"} SMS
                          </span>
                          <span
                            className={
                              member.receives_whatsapp
                                ? "text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {member.receives_whatsapp ? "✓" : "✗"} WhatsApp
                          </span>
                          <span
                            className={
                              member.receives_emails
                                ? "text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {member.receives_emails ? "✓" : "✗"} Email
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleStaffAvailability(
                              member.id,
                              member.is_available,
                            )
                          }
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            member.is_available
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {member.is_available ? "Available" : "Unavailable"}
                        </button>
                        <button
                          onClick={() => removeStaff(member.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Staff Member</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newStaffData.email}
                  onChange={(e) =>
                    setNewStaffData({ ...newStaffData, email: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  placeholder="staff@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newStaffData.phone_number}
                  onChange={(e) =>
                    setNewStaffData({
                      ...newStaffData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  placeholder="+447777777777"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={newStaffData.role}
                  onChange={(e) =>
                    setNewStaffData({ ...newStaffData, role: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="trainer">Trainer</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddStaff(false);
                  setNewStaffData({
                    email: "",
                    phone_number: "",
                    role: "staff",
                  });
                }}
                className="px-4 py-2 text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={addStaff}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
