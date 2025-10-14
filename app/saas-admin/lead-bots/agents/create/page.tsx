"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
}

export default function CreateAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [sops, setSops] = useState<any[]>([]);
  const [selectedSOPs, setSelectedSOPs] = useState<Set<string>>(new Set());
  const [loadingSOPs, setLoadingSOPs] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    organization_id: "", // For super admins to select
    ghlLocationId: "",
    ghlApiKey: "",
  });

  // Check if user is super admin and fetch organizations
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const { user } = await response.json();
          const superAdmin =
            user.email === "sam@gymleadhub.co.uk" ||
            user.email?.endsWith("@gymleadhub.co.uk");

          setIsSuperAdmin(superAdmin);

          if (superAdmin) {
            // Fetch all organizations for super admin
            const orgsResponse = await fetch("/api/admin/organizations");
            if (orgsResponse.ok) {
              const { organizations } = await orgsResponse.json();
              setOrganizations(organizations || []);

              // Default to GymLeadHub organization for baseline agents
              const gymleadhubOrg = organizations.find((org: Organization) => org.id === '0ef8a082-4458-400a-8c50-75b47e461f91');
              if (gymleadhubOrg) {
                setFormData(prev => ({ ...prev, organization_id: gymleadhubOrg.id }));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Fetch SOPs on mount (global SOPs available to all)
  useEffect(() => {
    fetchSOPs();
  }, []);

  async function fetchSOPs() {
    try {
      setLoadingSOPs(true);
      const response = await fetch('/api/saas-admin/lead-bots/sops');
      if (response.ok) {
        const { sops } = await response.json();
        setSops(sops || []);
      }
    } catch (error) {
      console.error("Error fetching SOPs:", error);
    } finally {
      setLoadingSOPs(false);
    }
  }

  function handleToggleSOP(sopId: string) {
    const newSelected = new Set(selectedSOPs);
    if (newSelected.has(sopId)) {
      newSelected.delete(sopId);
    } else {
      newSelected.add(sopId);
    }
    setSelectedSOPs(newSelected);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ghlLocationId || !formData.ghlApiKey) {
      alert("Please provide GoHighLevel Location ID and API Key");
      return;
    }

    // Organization is optional - can be null for baseline/template agents
    // if (isSuperAdmin && !formData.organization_id) {
    //   alert("Please select an organization");
    //   return;
    // }

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name,
        description: formData.description,
        role: "lead_qualification",
        system_prompt: "", // Empty for now, will be generated from SOPs
        sop_ids: Array.from(selectedSOPs), // Send selected SOP IDs
        model: "gpt-5", // Hardcoded
        temperature: 0.7, // Hardcoded
        max_tokens: 500, // Hardcoded
        enabled: true,
        metadata: {
          gohighlevel_location_id: formData.ghlLocationId,
          gohighlevel_api_key: formData.ghlApiKey,
          integration_type: "gohighlevel_plugin",
        },
      };

      // Super admins pass organization_id explicitly
      if (isSuperAdmin) {
        payload.organization_id = formData.organization_id;
      }

      const response = await fetch("/api/saas-admin/lead-bots/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to create agent");
      }

      const data = await response.json();
      setWebhookUrl(data.agent.webhookUrl);
    } catch (error: any) {
      console.error("Error creating agent:", error);
      alert(`Failed to create agent: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href="/saas-admin/lead-bots/agents"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Agents
        </Link>
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-white">Create AI Agent</h1>
        </div>
        <p className="mt-2 text-gray-400">
          Connect a new AI chatbot to GoHighLevel for lead qualification
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Basic Information
          </h3>
          <div className="space-y-4">
            {/* Super Admin: Organization Selector */}
            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization
                  <span className="ml-2 text-xs text-purple-400">
                    Defaults to GymLeadHub for baseline agents
                  </span>
                </label>
                <select
                  value={formData.organization_id}
                  onChange={(e) =>
                    setFormData({ ...formData, organization_id: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.id === '0ef8a082-4458-400a-8c50-75b47e461f91' ? '(Default - Internal)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  GymLeadHub org is used for baseline/template agents. Change to assign to a specific gym.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Lead Qualification Bot"
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Brief description of what this agent does"
              />
            </div>
          </div>
        </div>

        {/* GoHighLevel Connection */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            GoHighLevel Connection
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Connect this agent to your GoHighLevel account. The agent will be
            triggered by GHL automations.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GHL Location ID *
              </label>
              <input
                type="text"
                value={formData.ghlLocationId}
                onChange={(e) =>
                  setFormData({ ...formData, ghlLocationId: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., nwQfHCknxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in GoHighLevel → Settings → Business Profile
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GHL API Key *
              </label>
              <input
                type="password"
                value={formData.ghlApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, ghlApiKey: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Create in GoHighLevel → Settings → API Key
              </p>
            </div>
          </div>
        </div>

        {/* AI Instructions (SOPs) */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            AI Instructions (SOPs)
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Select Standard Operating Procedures to define how this agent behaves.
            All agents use GPT-5 for best performance.
          </p>

          {loadingSOPs ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span className="ml-2 text-gray-400">Loading SOPs...</span>
            </div>
          ) : sops.length === 0 ? (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-6 text-center">
              <h4 className="text-lg font-semibold text-blue-200 mb-2">
                No SOPs Available
              </h4>
              <p className="text-sm text-blue-100 mb-4">
                You need to create Standard Operating Procedures before creating agents.
              </p>
              <div className="flex gap-3 justify-center">
                <a
                  href="/saas-admin/lead-bots/sops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create SOP Now
                </a>
                <button
                  type="button"
                  onClick={() => {
                    // Allow creating agent without SOPs (will need to add later)
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Create SOPs Later
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Agents without SOPs will have no instructions and won't function properly
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select SOPs (check all that apply)
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sops.map((sop) => (
                  <div
                    key={sop.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSOPs.has(sop.id)
                        ? "bg-orange-900 bg-opacity-20 border-orange-500"
                        : "bg-gray-700 border-gray-600 hover:border-gray-500"
                    }`}
                    onClick={() => handleToggleSOP(sop.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSOPs.has(sop.id)}
                        onChange={() => handleToggleSOP(sop.id)}
                        className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{sop.name}</div>
                        {sop.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {sop.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {sop.content.substring(0, 150)}
                          {sop.content.length > 150 ? "..." : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Selected SOPs will be combined in order to create the agent's system prompt.{" "}
                <a
                  href="/saas-admin/lead-bots/sops"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Manage SOPs
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Integration Instructions */}
        <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">
            📋 Setup Instructions
          </h3>
          <ol className="text-sm text-blue-100 space-y-2 list-decimal list-inside">
            <li>Create this agent to get your unique webhook URL</li>
            <li>In GoHighLevel, create a workflow automation</li>
            <li>Add a "Webhook" action in your workflow</li>
            <li>
              Paste the webhook URL you'll receive after creating this agent
            </li>
            <li>The AI will handle the conversation and return data to GHL</li>
          </ol>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/saas-admin/lead-bots/agents"
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                Create Agent
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {webhookUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-white">
                Agent Created Successfully!
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Your AI agent is ready to connect to GoHighLevel
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      alert("Webhook URL copied to clipboard!");
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-200 mb-2">
                  Next Steps
                </h4>
                <ol className="text-sm text-blue-100 space-y-2 list-decimal list-inside">
                  <li>Copy the webhook URL above</li>
                  <li>Go to GoHighLevel and create a new workflow automation</li>
                  <li>Add a "Webhook" action to your workflow</li>
                  <li>Paste the webhook URL</li>
                  <li>
                    Configure the trigger (e.g., when a lead is created or
                    messages)
                  </li>
                  <li>
                    The AI will automatically handle conversations and return
                    data to GHL
                  </li>
                </ol>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end">
              <Link
                href="/saas-admin/lead-bots/agents"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Go to Agents List
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
