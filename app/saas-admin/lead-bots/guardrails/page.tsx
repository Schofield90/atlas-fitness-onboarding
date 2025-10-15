"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface Guardrail {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const GUARDRAIL_TYPES = [
  {
    value: "tag_blocker",
    label: "Tag Blocker",
    icon: TagIcon,
    description: "Block messages based on contact tags",
    color: "text-red-500",
  },
  {
    value: "business_hours",
    label: "Business Hours",
    icon: ClockIcon,
    description: "Only allow messages during business hours",
    color: "text-blue-500",
  },
  {
    value: "rate_limit",
    label: "Rate Limiting",
    icon: ChartBarIcon,
    description: "Limit message frequency per lead",
    color: "text-yellow-500",
  },
  {
    value: "lead_status",
    label: "Lead Status",
    icon: UserIcon,
    description: "Filter by lead status",
    color: "text-green-500",
  },
  {
    value: "human_takeover",
    label: "Human Takeover",
    icon: UserIcon,
    description: "Pause AI when human sends manual message",
    color: "text-purple-500",
  },
  {
    value: "conversation_status",
    label: "Conversation Status",
    icon: ChatBubbleLeftRightIcon,
    description: "Filter by conversation status",
    color: "text-cyan-500",
  },
];

export default function GuardrailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "tag_blocker",
    config: "{}",
    enabled: true,
  });

  // Fetch guardrails on mount
  useEffect(() => {
    fetchGuardrails();
  }, []);

  async function fetchGuardrails() {
    try {
      setLoading(true);
      const response = await fetch('/api/saas-admin/lead-bots/guardrails');
      if (response.ok) {
        const { data } = await response.json();
        setGuardrails(data || []);
      }
    } catch (error) {
      console.error("Error fetching guardrails:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingGuardrail(null);
    setFormData({
      name: "",
      description: "",
      type: "tag_blocker",
      config: JSON.stringify({
        blocked_tags: ["ai off", "do not contact"],
        case_sensitive: false,
        match_type: "contains"
      }, null, 2),
      enabled: true
    });
    setShowModal(true);
  }

  function handleEdit(guardrail: Guardrail) {
    setEditingGuardrail(guardrail);
    setFormData({
      name: guardrail.name,
      description: guardrail.description || "",
      type: guardrail.type,
      config: JSON.stringify(guardrail.config, null, 2),
      enabled: guardrail.enabled,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    // Validate JSON config
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(formData.config);
    } catch (error) {
      alert("Invalid JSON in config field");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        config: parsedConfig,
        enabled: formData.enabled,
        // TODO: Add organization selector in UI - for now using GymLeadHub org
        organizationId: "0ef8a082-4458-400a-8c50-75b47e461f91",
      };

      let response;
      if (editingGuardrail) {
        // Update existing guardrail
        response = await fetch(`/api/saas-admin/lead-bots/guardrails`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingGuardrail.id }),
        });
      } else {
        // Create new guardrail
        response = await fetch("/api/saas-admin/lead-bots/guardrails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save guardrail");
      }

      // Refresh guardrails list
      await fetchGuardrails();
      setShowModal(false);
      setFormData({ name: "", description: "", type: "tag_blocker", config: "{}", enabled: true });
      setEditingGuardrail(null);
    } catch (error: any) {
      console.error("Error saving guardrail:", error);
      alert(`Failed to save guardrail: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this guardrail? This will unlink it from all agents.")) {
      return;
    }

    try {
      const response = await fetch(`/api/saas-admin/lead-bots/guardrails?id=${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete guardrail");
      }

      // Refresh guardrails list
      await fetchGuardrails();
    } catch (error: any) {
      console.error("Error deleting guardrail:", error);
      alert(`Failed to delete guardrail: ${error.message}`);
    }
  }

  async function toggleEnabled(guardrail: Guardrail) {
    try {
      const response = await fetch(`/api/saas-admin/lead-bots/guardrails`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guardrail.id, enabled: !guardrail.enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle guardrail");
      }

      // Refresh guardrails list
      await fetchGuardrails();
    } catch (error: any) {
      console.error("Error toggling guardrail:", error);
      alert(`Failed to toggle guardrail: ${error.message}`);
    }
  }

  function getGuardrailTypeInfo(type: string) {
    return GUARDRAIL_TYPES.find(t => t.value === type) || GUARDRAIL_TYPES[0];
  }

  function handleTypeChange(type: string) {
    // Set default config based on type
    let defaultConfig = {};

    switch (type) {
      case "tag_blocker":
        defaultConfig = {
          blocked_tags: ["ai off", "do not contact"],
          case_sensitive: false,
          match_type: "contains"
        };
        break;
      case "business_hours":
        defaultConfig = {
          timezone: "Europe/London",
          schedule: {
            monday: { enabled: true, start: "09:00", end: "17:00" },
            tuesday: { enabled: true, start: "09:00", end: "17:00" },
            wednesday: { enabled: true, start: "09:00", end: "17:00" },
            thursday: { enabled: true, start: "09:00", end: "17:00" },
            friday: { enabled: true, start: "09:00", end: "17:00" },
            saturday: { enabled: false },
            sunday: { enabled: false }
          }
        };
        break;
      case "rate_limit":
        defaultConfig = {
          max_messages_per_day: 3,
          max_messages_per_hour: 2,
          min_minutes_between_messages: 120
        };
        break;
      case "lead_status":
        defaultConfig = {
          allowed_statuses: ["new", "contacted", "qualified"],
          blocked_statuses: ["converted", "lost", "archived"]
        };
        break;
      case "human_takeover":
        defaultConfig = {
          cooldown_minutes: 30,
          detect_manual_messages: true
        };
        break;
      case "conversation_status":
        defaultConfig = {
          allowed_statuses: ["active"],
          blocked_statuses: ["archived", "deleted", "paused"]
        };
        break;
    }

    setFormData({
      ...formData,
      type,
      config: JSON.stringify(defaultConfig, null, 2)
    });
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/saas-admin/lead-bots/agents"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Agents
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
              <h1 className="text-3xl font-bold text-white">Guardrails</h1>
            </div>
            <p className="mt-2 text-gray-400">
              Safety rules to control when AI agents can send messages
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Guardrail
          </button>
        </div>
      </div>

      {/* Guardrails List */}
      {guardrails.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            No guardrails yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first guardrail to control AI agent behavior
          </p>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create First Guardrail
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guardrails.map((guardrail) => {
            const typeInfo = getGuardrailTypeInfo(guardrail.type);
            const Icon = typeInfo.icon;

            return (
              <div
                key={guardrail.id}
                className={`bg-gray-800 rounded-lg border ${
                  guardrail.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'
                } p-6 hover:border-green-500 transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-6 w-6 ${typeInfo.color} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{guardrail.name}</h3>
                      <span className="text-xs text-gray-400">{typeInfo.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleEnabled(guardrail)}
                      className={`p-1 transition-colors ${
                        guardrail.enabled
                          ? 'text-green-500 hover:text-green-400'
                          : 'text-gray-600 hover:text-gray-500'
                      }`}
                      title={guardrail.enabled ? "Enabled" : "Disabled"}
                    >
                      <ShieldCheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(guardrail)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(guardrail.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {guardrail.description && (
                  <p className="text-sm text-gray-400 mb-3">{guardrail.description}</p>
                )}

                <div className="bg-gray-900 rounded p-3 mb-3">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-4">
                    {JSON.stringify(guardrail.config, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Last updated: {new Date(guardrail.updated_at).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    guardrail.enabled
                      ? 'bg-green-900 text-green-300'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {guardrail.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-white">
                {editingGuardrail ? "Edit Guardrail" : "Create New Guardrail"}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Define safety rules to control AI agent messaging
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Business Hours Only"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Brief description of this guardrail's purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Guardrail Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={!!editingGuardrail}
                >
                  {GUARDRAIL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
                {editingGuardrail && (
                  <p className="text-xs text-gray-500 mt-1">
                    Type cannot be changed after creation
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Configuration (JSON) *
                </label>
                <textarea
                  value={formData.config}
                  onChange={(e) =>
                    setFormData({ ...formData, config: e.target.value })
                  }
                  rows={15}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder='{"example": "config"}'
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  JSON configuration specific to the guardrail type
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                />
                <label htmlFor="enabled" className="text-sm text-gray-300">
                  Enable this guardrail immediately
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: "", description: "", type: "tag_blocker", config: "{}", enabled: true });
                    setEditingGuardrail(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingGuardrail ? "Update Guardrail" : "Create Guardrail"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
