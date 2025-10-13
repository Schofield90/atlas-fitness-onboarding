"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { createClient } from "@/app/lib/supabase/client";
import {
  Bot,
  Plus,
  Webhook,
  Calendar,
  MessageSquare,
  Settings,
  ChevronRight,
  Phone,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

interface ChatAgent {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  ghl_webhook_url?: string;
  ghl_api_key?: string;
  ghl_calendar_id?: string;
  follow_up_config: {
    enabled: boolean;
    delay_hours: number;
    max_follow_ups: number;
    channels: string[];
  };
  booking_config: {
    enabled: boolean;
    auto_book: boolean;
    confirmation_required: boolean;
  };
  conversations_count: number;
  leads_converted: number;
  bookings_made: number;
  created_at: string;
}

export default function AIChatAgentsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadChatAgents();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/get-organization");
      const result = await response.json();

      if (!result.success || !result.data?.user) {
        router.push("/owner-login");
        return;
      }

      setUser(result.data.user);
      setLoading(false);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/owner-login");
    }
  };

  const loadChatAgents = async () => {
    try {
      // Load AI agents configured for chat/follow-up
      const response = await fetch("/api/crm/chat-agents");
      const result = await response.json();

      if (result.success) {
        setAgents(result.agents || []);
      }
    } catch (error) {
      console.error("Error loading chat agents:", error);
    }
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowCreateModal(true);
  };

  const handleConfigureAgent = (agent: ChatAgent) => {
    setSelectedAgent(agent);
    setShowConfigModal(true);
  };

  const handleToggleStatus = async (agent: ChatAgent) => {
    try {
      const response = await fetch(`/api/crm/chat-agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: agent.status === "active" ? "inactive" : "active",
        }),
      });

      if (response.ok) {
        loadChatAgents();
      }
    } catch (error) {
      console.error("Error toggling agent status:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userData={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading AI Chat Agents...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={user}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <span>CRM</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-orange-500">AI Intelligence</span>
              <ChevronRight className="h-4 w-4" />
              <span>Chat Agents</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">AI Chat Agents</h1>
            <p className="text-gray-300">
              Manage AI-powered chat agents that follow up leads and book calls
              via GoHighLevel webhooks
            </p>
          </div>
          <button
            onClick={handleCreateAgent}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Chat Agent
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Bot className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">TOTAL</span>
            </div>
            <p className="text-2xl font-bold">{agents.length}</p>
            <p className="text-sm text-gray-400">Active Agents</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">THIS WEEK</span>
            </div>
            <p className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.conversations_count, 0)}
            </p>
            <p className="text-sm text-gray-400">Conversations</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
              <span className="text-xs text-gray-400">CONVERTED</span>
            </div>
            <p className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.leads_converted, 0)}
            </p>
            <p className="text-sm text-gray-400">Leads</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-gray-400">BOOKED</span>
            </div>
            <p className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.bookings_made, 0)}
            </p>
            <p className="text-sm text-gray-400">Calls</p>
          </div>
        </div>

        {/* Integration Setup Banner */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <Webhook className="h-10 w-10 text-blue-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">
                GoHighLevel Integration
              </h3>
              <p className="text-gray-300 mb-4">
                Connect your GoHighLevel account to enable AI-powered lead
                follow-ups and automatic call booking. Your chat agents will
                receive webhook notifications and interact with leads in
                real-time.
              </p>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Configure Webhooks
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        {agents.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Chat Agents Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first AI chat agent to start following up leads and
              booking calls automatically
            </p>
            <button
              onClick={handleCreateAgent}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-orange-500 transition-colors"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-orange-900/30 rounded-lg">
                      <Bot className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      agent.status === "active"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {agent.status === "active" ? "Active" : "Inactive"}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {agent.conversations_count}
                    </div>
                    <div className="text-xs text-gray-400">Conversations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {agent.leads_converted}
                    </div>
                    <div className="text-xs text-gray-400">Converted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {agent.bookings_made}
                    </div>
                    <div className="text-xs text-gray-400">Booked</div>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {agent.ghl_webhook_url && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                      <Webhook className="h-3 w-3" />
                      Webhook
                    </div>
                  )}
                  {agent.follow_up_config.enabled && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs">
                      <MessageSquare className="h-3 w-3" />
                      Follow-ups
                    </div>
                  )}
                  {agent.booking_config.enabled && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                      <Calendar className="h-3 w-3" />
                      Booking
                    </div>
                  )}
                  {agent.follow_up_config.channels.includes("email") && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                      <Mail className="h-3 w-3" />
                      Email
                    </div>
                  )}
                  {agent.follow_up_config.channels.includes("sms") && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                      <Phone className="h-3 w-3" />
                      SMS
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfigureAgent(agent)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Configure
                  </button>
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 ${
                      agent.status === "active"
                        ? "bg-red-900/30 hover:bg-red-900/50 text-red-400"
                        : "bg-green-900/30 hover:bg-green-900/50 text-green-400"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    {agent.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        `/org/${orgSlug}/ai-agents/chat/${agent.id}`
                      )
                    }
                    className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    View Activity
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Configure Modals would go here */}
      {/* TODO: Implement AgentConfigModal component */}
    </DashboardLayout>
  );
}
