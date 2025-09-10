"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  ChefHat,
  Activity,
  AlertCircle,
  Check,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Send,
} from "lucide-react";

interface CoachDashboardProps {
  coach: any;
  organizationId: string;
}

interface ClientNutrition {
  id: string;
  name: string;
  email: string;
  profile?: any;
  activePlan?: any;
  lastLog?: any;
  adherence?: number;
  unreadMessages?: number;
}

export default function CoachDashboard({
  coach,
  organizationId,
}: CoachDashboardProps) {
  const [clients, setClients] = useState<ClientNutrition[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientNutrition | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "clients" | "plans" | "messages"
  >("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const supabase = createClient();

  useEffect(() => {
    loadClientsData();
  }, [organizationId]);

  const loadClientsData = async () => {
    try {
      setLoading(true);

      // Get all clients in the organization
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId);

      if (clientsError) throw clientsError;

      // Get nutrition profiles for all clients
      const clientIds = clientsData?.map((c) => c.id) || [];

      const { data: profiles } = await supabase
        .from("nutrition_profiles")
        .select("*")
        .in("client_id", clientIds);

      // Get active meal plans
      const { data: mealPlans } = await supabase
        .from("meal_plans")
        .select("*")
        .in("client_id", clientIds)
        .eq("status", "active");

      // Get recent nutrition logs
      const { data: logs } = await supabase
        .from("nutrition_logs")
        .select("*")
        .in("client_id", clientIds)
        .gte(
          "log_date",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Get unread messages
      const { data: messages } = await supabase
        .from("nutrition_coach_messages")
        .select("*")
        .in("client_id", clientIds)
        .eq("message_type", "client_to_coach")
        .eq("is_read", false);

      // Combine all data
      const enrichedClients =
        clientsData?.map((client) => {
          const profile = profiles?.find((p) => p.client_id === client.id);
          const activePlan = mealPlans?.find((p) => p.client_id === client.id);
          const clientLogs =
            logs?.filter((l) => l.client_id === client.id) || [];
          const unreadMessages =
            messages?.filter((m) => m.client_id === client.id).length || 0;

          // Calculate adherence
          let adherence = 0;
          if (clientLogs.length > 0) {
            const totalAdherence = clientLogs.reduce(
              (sum, log) => sum + (log.adherence_percentage || 0),
              0,
            );
            adherence = Math.round(totalAdherence / clientLogs.length);
          }

          return {
            id: client.id,
            name: client.name || "Unknown",
            email: client.email,
            profile,
            activePlan,
            lastLog: clientLogs[0],
            adherence,
            unreadMessages,
          };
        }) || [];

      setClients(enrichedClients);
    } catch (error) {
      console.error("Error loading clients data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && client.activePlan) ||
      (filterStatus === "inactive" && !client.activePlan);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.activePlan).length,
    avgAdherence: Math.round(
      clients.reduce((sum, c) => sum + (c.adherence || 0), 0) /
        clients.length || 0,
    ),
    pendingMessages: clients.reduce(
      (sum, c) => sum + (c.unreadMessages || 0),
      0,
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-orange-500" />
              Nutrition Coach Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage client nutrition plans and track progress
            </p>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clients</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalClients}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Plans</p>
                <p className="text-2xl font-bold text-white">
                  {stats.activeClients}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Adherence</p>
                <p className="text-2xl font-bold text-white">
                  {stats.avgAdherence}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Messages</p>
                <p className="text-2xl font-bold text-white">
                  {stats.pendingMessages}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "clients", label: "Clients", icon: Users },
            { id: "plans", label: "Meal Plans", icon: Calendar },
            { id: "messages", label: "Messages", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "clients" && (
          <div>
            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Clients</option>
                <option value="active">Active Plans</option>
                <option value="inactive">No Active Plan</option>
              </select>

              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Plan
              </button>
            </div>

            {/* Clients List */}
            <div className="grid gap-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                          <span className="text-orange-500 font-bold">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {client.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {client.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Status Indicators */}
                      <div className="flex items-center gap-4">
                        {client.activePlan ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-500">
                              Active Plan
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">
                              No Plan
                            </span>
                          </div>
                        )}

                        {client.adherence !== undefined && (
                          <div className="text-center">
                            <p className="text-sm text-gray-400">Adherence</p>
                            <p
                              className={`font-bold ${
                                client.adherence >= 80
                                  ? "text-green-500"
                                  : client.adherence >= 60
                                    ? "text-yellow-500"
                                    : "text-red-500"
                              }`}
                            >
                              {client.adherence}%
                            </p>
                          </div>
                        )}

                        {client.unreadMessages > 0 && (
                          <div className="relative">
                            <MessageSquare className="h-5 w-5 text-purple-500" />
                            <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {client.unreadMessages}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  {client.profile && (
                    <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Goal</p>
                        <p className="text-white capitalize">
                          {client.profile.goal?.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Calories</p>
                        <p className="text-white">
                          {client.profile.target_calories} kcal
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Protein</p>
                        <p className="text-white">
                          {client.profile.protein_grams}g
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Last Log</p>
                        <p className="text-white">
                          {client.lastLog
                            ? new Date(
                                client.lastLog.log_date,
                              ).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs content would go here */}
      </div>
    </div>
  );
}
