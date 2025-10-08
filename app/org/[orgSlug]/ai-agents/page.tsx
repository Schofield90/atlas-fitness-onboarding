"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { createClient } from "@/app/lib/supabase/client";
import {
  Bot,
  Plus,
  Search,
  Filter,
  DollarSign,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { AgentCard } from "./components/AgentCard";
import { AgentFormModal } from "./components/AgentFormModal";
import { DeleteAgentModal } from "./components/DeleteAgentModal";

interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar_url?: string;
  enabled: boolean;
  is_default: boolean;
  model: string;
  temperature: number;
  system_prompt: string;
  allowed_tools: string[];
  created_at: string;
  conversations_count?: number;
  tasks_count?: number;
}

interface AgentStats {
  total_agents: number;
  active_conversations: number;
  monthly_cost: number;
}

export default function AIAgentsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    total_agents: 0,
    active_conversations: 0,
    monthly_cost: 0,
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadAgents();
      loadStats();
    }
  }, [user]);

  const checkAuth = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push("/owner-login");
      return;
    }

    setUser(currentUser);
    setLoading(false);
  };

  const loadAgents = async () => {
    try {
      const response = await fetch("/api/ai-agents");
      const result = await response.json();

      if (result.success) {
        // Fetch counts for each agent
        const agentsWithCounts = await Promise.all(
          result.agents.map(async (agent: Agent) => {
            const [conversationsRes, tasksRes] = await Promise.all([
              fetch(`/api/ai-agents/conversations?agentId=${agent.id}`),
              fetch(`/api/ai-agents/tasks?agentId=${agent.id}`),
            ]);

            const conversationsData = await conversationsRes.json();
            const tasksData = await tasksRes.json();

            return {
              ...agent,
              conversations_count: conversationsData.conversations?.length || 0,
              tasks_count: tasksData.tasks?.length || 0,
            };
          }),
        );

        setAgents(agentsWithCounts);
      }
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/ai-agents/stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowCreateModal(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const handleDeleteAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  const handleToggleEnabled = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/ai-agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !agent.enabled }),
      });

      if (response.ok) {
        loadAgents();
      }
    } catch (error) {
      console.error("Error toggling agent:", error);
    }
  };

  const handleChatNow = (agent: Agent) => {
    router.push(`/org/${orgSlug}/ai-agents/chat/${agent.id}`);
  };

  const handleFormSuccess = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    loadAgents();
    loadStats();
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    loadAgents();
    loadStats();
  };

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      searchQuery === "" ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || agent.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "enabled" && agent.enabled) ||
      (statusFilter === "disabled" && !agent.enabled);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const roles = [
    { value: "all", label: "All Roles" },
    { value: "customer_support", label: "Customer Support" },
    { value: "financial", label: "Financial" },
    { value: "social_media", label: "Social Media" },
    { value: "custom", label: "Custom" },
  ];

  if (loading) {
    return (
      <DashboardLayout userData={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading AI agents...</p>
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
            <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
            <p className="text-gray-300">
              Manage your AI-powered assistants and automation
            </p>
          </div>
          <button
            onClick={handleCreateAgent}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Agent
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Bot className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">TOTAL</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_agents}</p>
            <p className="text-sm text-gray-400">AI Agents</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">ACTIVE</span>
            </div>
            <p className="text-2xl font-bold">{stats.active_conversations}</p>
            <p className="text-sm text-gray-400">Conversations</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <p className="text-2xl font-bold">
              ${stats.monthly_cost.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">AI Usage Cost</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <CheckCircle2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        {filteredAgents.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No agents found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first AI agent"}
            </p>
            {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
              <button
                onClick={handleCreateAgent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Agent
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
                onToggleEnabled={handleToggleEnabled}
                onChatNow={handleChatNow}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AgentFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleFormSuccess}
        agent={null}
      />

      <AgentFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleFormSuccess}
        agent={selectedAgent}
      />

      <DeleteAgentModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteSuccess}
        agent={selectedAgent}
      />
    </DashboardLayout>
  );
}
