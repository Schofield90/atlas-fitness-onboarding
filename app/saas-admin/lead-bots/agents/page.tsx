"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Cog8ToothIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  organizationName: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  role: string;
  allowedTools: string[];
  ghlLocationId?: string;
  ghlApiKey?: string;
  ghlCalendarId?: string;
}

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const orgFilter = searchParams?.get("org");

  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [orgFilter]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (orgFilter) params.set('org', orgFilter);

      const response = await fetch(`/api/saas-admin/lead-bots/agents?${params}`);
      if (!response.ok) throw new Error("Failed to fetch agents");

      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveAgent = async () => {
    if (!editingAgent) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/saas-admin/lead-bots/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAgent.name,
          description: editingAgent.description,
          system_prompt: editingAgent.systemPrompt,
          model: editingAgent.model,
          temperature: editingAgent.temperature,
          max_tokens: editingAgent.maxTokens,
          enabled: editingAgent.enabled,
          metadata: {
            gohighlevel_location_id: editingAgent.ghlLocationId || null,
            gohighlevel_api_key: editingAgent.ghlApiKey || null,
            gohighlevel_calendar_id: editingAgent.ghlCalendarId || null,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save agent");

      await fetchAgents();
      setEditingAgent(null);
      alert("Agent saved successfully");
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Failed to save agent");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = async (agent: AIAgent) => {
    try {
      const response = await fetch(`/api/saas-admin/lead-bots/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !agent.enabled }),
      });

      if (!response.ok) throw new Error("Failed to toggle agent");

      await fetchAgents();
    } catch (error) {
      console.error("Error toggling agent:", error);
      alert("Failed to toggle agent");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agent Configuration</h1>
          <p className="mt-2 text-gray-400">
            Configure AI agents for lead qualification per organization
          </p>
        </div>
        <Link
          href="/saas-admin/lead-bots/agents/create"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <SparklesIcon className="h-5 w-5" />
          Create Agent
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="ml-4 text-gray-400">Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <Cog8ToothIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No AI agents configured yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Agents are automatically created when leads come in via GoHighLevel webhook
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <SparklesIcon className="h-6 w-6 text-purple-500" />
                    <h3 className="text-xl font-semibold text-white">{agent.name}</h3>
                    {agent.enabled ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200 flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200 flex items-center">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{agent.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Organization:</span>
                      <p className="text-white font-medium">{agent.organizationName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Model:</span>
                      <p className="text-white font-medium">{agent.model}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Temperature:</span>
                      <p className="text-white font-medium">{agent.temperature}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Tokens:</span>
                      <p className="text-white font-medium">{agent.maxTokens}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAgent(agent)}
                    className="p-2 text-blue-500 hover:bg-blue-900 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleAgent(agent)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      agent.enabled
                        ? 'bg-red-900 hover:bg-red-800 text-red-200'
                        : 'bg-green-900 hover:bg-green-800 text-green-200'
                    }`}
                  >
                    {agent.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">System Prompt:</h4>
                <div className="bg-gray-700 rounded p-4 max-h-48 overflow-y-auto">
                  <pre className="text-white text-sm whitespace-pre-wrap font-mono">{agent.systemPrompt}</pre>
                </div>
              </div>

              {agent.allowedTools && agent.allowedTools.length > 0 && (
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Allowed Tools:</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent.allowedTools.map((tool, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-200"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">GoHighLevel Webhook URL:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://login.gymleadhub.co.uk'}/api/webhooks/ghl-bot/${agent.id}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-xs font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://login.gymleadhub.co.uk'}/api/webhooks/ghl-bot/${agent.id}`;
                      navigator.clipboard.writeText(url);
                      alert('Webhook URL copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-white">Edit AI Agent</h3>
              <p className="text-sm text-gray-400 mt-1">{editingAgent.organizationName}</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                  <select
                    value={editingAgent.model}
                    onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="gpt-5">GPT-5 (Latest)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editingAgent.temperature}
                    onChange={(e) => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0-2 (higher = more creative)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    step="50"
                    value={editingAgent.maxTokens}
                    onChange={(e) => setEditingAgent({ ...editingAgent, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Prompt
                  <span className="text-gray-500 ml-2">(AI behavior and instructions)</span>
                </label>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="You are a friendly AI assistant for [Gym Name]..."
                />
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">GoHighLevel Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GHL Location ID
                    </label>
                    <input
                      type="text"
                      value={editingAgent.ghlLocationId || ''}
                      onChange={(e) => setEditingAgent({ ...editingAgent, ghlLocationId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., nwQfHCknxxxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GHL API Key
                    </label>
                    <input
                      type="password"
                      value={editingAgent.ghlApiKey || ''}
                      onChange={(e) => setEditingAgent({ ...editingAgent, ghlApiKey: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GHL Calendar ID
                      <span className="ml-2 text-xs text-gray-500 font-normal">(Optional - for booking appointments)</span>
                    </label>
                    <input
                      type="text"
                      value={editingAgent.ghlCalendarId || ''}
                      onChange={(e) => setEditingAgent({ ...editingAgent, ghlCalendarId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., ocQGVDtRMxxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find in GoHighLevel → Calendars → Click calendar → Copy ID from URL
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={editingAgent.enabled}
                  onChange={(e) => setEditingAgent({ ...editingAgent, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-white">Enabled (AI will respond to leads)</label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingAgent(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAgent}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="ml-4 text-gray-400">Loading...</p>
      </div>
    }>
      <AgentsPageContent />
    </Suspense>
  );
}
