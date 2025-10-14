"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function CreateAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: `You are a friendly AI assistant for a fitness facility.

Your role is to qualify leads and book them for discovery calls. You should:

1. **Greet warmly** - Welcome them and thank them for their interest
2. **Ask about their goals** - What are they hoping to achieve? (weight loss, strength, fitness, etc.)
3. **Understand their experience** - Have they worked out before? Any injuries or limitations?
4. **Discover their budget** - What investment level are they comfortable with for their health?
5. **Check availability** - When would be the best time for a quick 15-minute discovery call?
6. **Book the call** - If qualified, schedule them for a call with our team

**Qualification Criteria:**
- Budget: Should be willing to invest £50-200/month
- Commitment: Looking to join within next 2-4 weeks
- Goals: Clear fitness goals that align with our programs

**Tone:** Friendly, helpful, enthusiastic but not pushy
**Response Length:** Keep messages short (2-3 sentences max)
**Speed:** Respond promptly when leads message`,
    ghlLocationId: "",
    ghlApiKey: "",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 500,
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ghlLocationId || !formData.ghlApiKey) {
      alert("Please provide GoHighLevel Location ID and API Key");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/saas-admin/lead-bots/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          role: "lead_qualification",
          system_prompt: formData.systemPrompt,
          model: formData.model,
          temperature: formData.temperature,
          max_tokens: formData.maxTokens,
          enabled: true,
          metadata: {
            gohighlevel_location_id: formData.ghlLocationId,
            gohighlevel_api_key: formData.ghlApiKey,
            integration_type: "gohighlevel_plugin",
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create agent");

      const data = await response.json();
      setWebhookUrl(data.agent.webhookUrl);
      alert("AI Agent created successfully! Copy the webhook URL to connect to GoHighLevel.");
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

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
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Lead Qualification Bot"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Brief description of what this agent does"
              />
            </div>
          </div>
        </div>

        {/* GoHighLevel Connection */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">GoHighLevel Connection</h3>
          <p className="text-sm text-gray-400 mb-4">
            Connect this agent to your GoHighLevel account. The agent will be triggered by GHL automations.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GHL Location ID *
              </label>
              <input
                type="text"
                value={formData.ghlLocationId}
                onChange={(e) => setFormData({ ...formData, ghlLocationId: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, ghlApiKey: e.target.value })}
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

        {/* AI Configuration */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Configuration</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="gpt-5">GPT-5 (Latest)</option>
                  <option value="gpt-4o">GPT-4o (Best)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cheap)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">0-2 (higher = creative)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
                <input
                  type="number"
                  min="50"
                  max="2000"
                  step="50"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                System Prompt (AI Instructions)
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={20}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Customize how the AI behaves and qualifies leads
              </p>
            </div>
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">📋 Setup Instructions</h3>
          <ol className="text-sm text-blue-100 space-y-2 list-decimal list-inside">
            <li>Create this agent to get your unique webhook URL</li>
            <li>In GoHighLevel, create a workflow automation</li>
            <li>Add a "Webhook" action in your workflow</li>
            <li>Paste the webhook URL you'll receive after creating this agent</li>
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
              <h3 className="text-2xl font-bold text-white">Agent Created Successfully!</h3>
              <p className="text-sm text-gray-400 mt-1">Your AI agent is ready to connect to GoHighLevel</p>
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
                <h4 className="text-lg font-semibold text-blue-200 mb-2">Next Steps</h4>
                <ol className="text-sm text-blue-100 space-y-2 list-decimal list-inside">
                  <li>Copy the webhook URL above</li>
                  <li>Go to GoHighLevel and create a new workflow automation</li>
                  <li>Add a "Webhook" action to your workflow</li>
                  <li>Paste the webhook URL</li>
                  <li>Configure the trigger (e.g., when a lead is created or messages)</li>
                  <li>The AI will automatically handle conversations and return data to GHL</li>
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
