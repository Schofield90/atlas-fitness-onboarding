"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Bot,
  Webhook,
  Calendar,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Hash,
  Key,
  Link as LinkIcon,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

const agentConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),

  // GoHighLevel Integration
  ghl_webhook_url: z.string().url().optional().or(z.literal("")),
  ghl_api_key: z.string().optional(),
  ghl_calendar_id: z.string().optional(),

  // Follow-up Configuration
  follow_up_enabled: z.boolean(),
  follow_up_delay_hours: z.number().min(0).max(168), // Max 1 week
  follow_up_max_attempts: z.number().min(1).max(10),
  follow_up_channels: z.array(z.enum(["email", "sms", "whatsapp"])),

  // Booking Configuration
  booking_enabled: z.boolean(),
  booking_auto_book: z.boolean(),
  booking_confirmation_required: z.boolean(),

  // AI Configuration
  ai_model: z.enum(["gpt-5-mini", "gpt-5", "claude-sonnet-4-20250514"]),
  ai_temperature: z.number().min(0).max(2),
  ai_system_prompt: z.string().min(1, "System prompt is required"),
});

type AgentConfigData = z.infer<typeof agentConfigSchema>;

interface AgentConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: any | null;
}

export function AgentConfigModal({
  open,
  onClose,
  onSuccess,
  agent,
}: AgentConfigModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "ghl" | "follow-up" | "booking" | "ai">("general");
  const [webhookCopied, setWebhookCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AgentConfigData>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      ghl_webhook_url: "",
      ghl_api_key: "",
      ghl_calendar_id: "",
      follow_up_enabled: true,
      follow_up_delay_hours: 24,
      follow_up_max_attempts: 3,
      follow_up_channels: ["email", "sms"],
      booking_enabled: true,
      booking_auto_book: false,
      booking_confirmation_required: true,
      ai_model: "gpt-5-mini",
      ai_temperature: 0.7,
      ai_system_prompt: `You are a friendly and professional AI assistant for a fitness gym. Your goal is to:
1. Engage with leads who inquire about memberships
2. Answer questions about programs, pricing, and facilities
3. Follow up with leads who haven't responded
4. Book discovery calls or gym tours
5. Be conversational, helpful, and encouraging

Always maintain a positive tone and highlight the benefits of joining the gym.`,
    },
  });

  useEffect(() => {
    if (open && agent) {
      reset({
        name: agent.name,
        description: agent.description,
        ghl_webhook_url: agent.ghl_webhook_url || "",
        ghl_api_key: agent.ghl_api_key || "",
        ghl_calendar_id: agent.ghl_calendar_id || "",
        follow_up_enabled: agent.follow_up_config?.enabled || true,
        follow_up_delay_hours: agent.follow_up_config?.delay_hours || 24,
        follow_up_max_attempts: agent.follow_up_config?.max_follow_ups || 3,
        follow_up_channels: agent.follow_up_config?.channels || ["email", "sms"],
        booking_enabled: agent.booking_config?.enabled || true,
        booking_auto_book: agent.booking_config?.auto_book || false,
        booking_confirmation_required: agent.booking_config?.confirmation_required || true,
        ai_model: agent.model || "gpt-5-mini",
        ai_temperature: agent.temperature || 0.7,
        ai_system_prompt: agent.system_prompt || "",
      });
    }
  }, [open, agent, reset]);

  const onSubmit = async (data: AgentConfigData) => {
    setSubmitting(true);
    setError(null);

    try {
      const url = agent
        ? `/api/crm/chat-agents/${agent.id}`
        : "/api/crm/chat-agents";
      const method = agent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          ghl_webhook_url: data.ghl_webhook_url,
          ghl_api_key: data.ghl_api_key,
          ghl_calendar_id: data.ghl_calendar_id,
          follow_up_config: {
            enabled: data.follow_up_enabled,
            delay_hours: data.follow_up_delay_hours,
            max_follow_ups: data.follow_up_max_attempts,
            channels: data.follow_up_channels,
          },
          booking_config: {
            enabled: data.booking_enabled,
            auto_book: data.booking_auto_book,
            confirmation_required: data.booking_confirmation_required,
          },
          model: data.ai_model,
          temperature: data.ai_temperature,
          system_prompt: data.ai_system_prompt,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save agent");
      }

      onSuccess();
      reset();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChannelToggle = (channel: "email" | "sms" | "whatsapp") => {
    const currentChannels = watch("follow_up_channels") || [];
    const updatedChannels = currentChannels.includes(channel)
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];
    setValue("follow_up_channels", updatedChannels);
  };

  const copyWebhookURL = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/ghl/${agent?.id || "AGENT_ID"}`;
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const tabs = [
    { id: "general" as const, label: "General", icon: Bot },
    { id: "ghl" as const, label: "GoHighLevel", icon: Webhook },
    { id: "follow-up" as const, label: "Follow-ups", icon: MessageSquare },
    { id: "booking" as const, label: "Booking", icon: Calendar },
    { id: "ai" as const, label: "AI Config", icon: Bot },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-orange-500" />
            {agent ? "Configure Chat Agent" : "Create Chat Agent"}
          </DialogTitle>
          <DialogDescription>
            {agent
              ? "Update agent settings, webhooks, and AI configuration"
              : "Create a new AI chat agent for lead follow-ups and call booking"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-700 mb-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-500"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-1">
            {activeTab === "general" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Agent Name *
                  </label>
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="Lead Follow-up Agent"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Automatically follows up with leads and books discovery calls..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "ghl" && (
              <div className="space-y-6">
                {/* Webhook URL Display */}
                {agent && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">
                          Your Webhook URL
                        </h4>
                        <p className="text-sm text-gray-400 mb-3">
                          Add this URL to your GoHighLevel workflow to trigger this agent when leads respond
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-green-400 font-mono overflow-x-auto">
                            {`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/ghl/${agent.id}`}
                          </code>
                          <button
                            type="button"
                            onClick={copyWebhookURL}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                          >
                            {webhookCopied ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      GoHighLevel API Key
                    </div>
                  </label>
                  <input
                    {...register("ghl_api_key")}
                    type="password"
                    placeholder="ghl_xxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Required to book calls and update lead status in GoHighLevel
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      GoHighLevel Calendar ID
                    </div>
                  </label>
                  <input
                    {...register("ghl_calendar_id")}
                    type="text"
                    placeholder="cal_xxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The calendar to use when booking discovery calls
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Setup Instructions
                  </h4>
                  <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Go to your GoHighLevel workflow builder</li>
                    <li>Add a "Webhook" action node</li>
                    <li>Paste your webhook URL above</li>
                    <li>Set method to POST</li>
                    <li>Map lead data to webhook payload</li>
                    <li>Test the webhook connection</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === "follow-up" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium mb-1">Enable Follow-ups</h4>
                    <p className="text-sm text-gray-400">
                      Automatically follow up with leads who don't respond
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("follow_up_enabled")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Follow-up Delay (hours)
                    </div>
                  </label>
                  <input
                    {...register("follow_up_delay_hours", { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="168"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Wait this long before sending the first follow-up
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Maximum Follow-up Attempts
                    </div>
                  </label>
                  <input
                    {...register("follow_up_max_attempts", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Stop following up after this many attempts
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Follow-up Channels
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "email" as const, label: "Email", icon: Mail },
                      { id: "sms" as const, label: "SMS", icon: Phone },
                      { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
                    ].map((channel) => {
                      const Icon = channel.icon;
                      const isActive = watch("follow_up_channels")?.includes(channel.id);
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => handleChannelToggle(channel.id)}
                          className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                            isActive
                              ? "border-orange-500 bg-orange-900/20 text-orange-400"
                              : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{channel.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "booking" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium mb-1">Enable Call Booking</h4>
                    <p className="text-sm text-gray-400">
                      Agent can book discovery calls with leads
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("booking_enabled")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium mb-1">Auto-book Calls</h4>
                    <p className="text-sm text-gray-400">
                      Automatically book without asking for confirmation
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("booking_auto_book")}
                      disabled={!watch("booking_enabled")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 disabled:opacity-50"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium mb-1">Confirmation Required</h4>
                    <p className="text-sm text-gray-400">
                      Send confirmation after booking
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("booking_confirmation_required")}
                      disabled={!watch("booking_enabled")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 disabled:opacity-50"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    AI Model
                  </label>
                  <select
                    {...register("ai_model")}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="gpt-5-mini">GPT-5 Mini (Fast & Cheap)</option>
                    <option value="gpt-5">GPT-5 (Advanced)</option>
                    <option value="claude-sonnet-4-20250514">
                      Claude Sonnet 4.5 (Most Advanced)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Temperature: {watch("ai_temperature")?.toFixed(2)}
                  </label>
                  <input
                    {...register("ai_temperature", { valueAsNumber: true })}
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Focused (0)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    System Prompt *
                  </label>
                  <textarea
                    {...register("ai_system_prompt")}
                    rows={12}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono text-sm"
                  />
                  {errors.ai_system_prompt && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.ai_system_prompt.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Define how the AI agent should behave and respond to leads
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="border-t border-gray-700 pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {agent ? "Update Agent" : "Create Agent"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
