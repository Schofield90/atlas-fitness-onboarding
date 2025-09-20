"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Building2,
  Users,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Settings,
  Activity,
  ChevronLeft,
  Edit,
  Trash2,
  UserPlus,
  BarChart3,
} from "lucide-react";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const [organization, setOrganization] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOrganization();
      fetchUsers();
      fetchLeads();
    }
  }, [params.id]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: userOrgs } = await supabase
        .from("user_organizations")
        .select("*, user:auth.users!user_id(*)")
        .eq("organization_id", params.id)
        .eq("is_active", true);

      // Fallback to basic query if join fails
      if (!userOrgs) {
        const { data: basicUserOrgs } = await supabase
          .from("user_organizations")
          .select("*")
          .eq("organization_id", params.id)
          .eq("is_active", true);

        setUsers(basicUserOrgs || []);
      } else {
        setUsers(userOrgs);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Organization Not Found
          </h2>
          <button
            onClick={() => router.push("/admin/organizations")}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "leads", label: "Leads", icon: BarChart3 },
    { id: "billing", label: "Billing", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                Organization Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white">{organization.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      organization.subscription_status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {organization.subscription_status || "Inactive"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Organization ID</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {organization.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Leads</p>
                    <p className="text-2xl font-bold">{leads.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Activity</p>
                    <p className="text-2xl font-bold">Active</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Organization Users</h3>
                <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <p className="text-gray-400">No users found</p>
              ) : (
                <div className="space-y-4">
                  {users.map((userOrg) => (
                    <div
                      key={userOrg.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium">{userOrg.user_id}</p>
                          <p className="text-sm text-gray-400">
                            {userOrg.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-600 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/20 rounded text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "leads":
        return (
          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Recent Leads</h3>
            </div>
            <div className="p-6">
              {leads.length === 0 ? (
                <p className="text-gray-400">No leads found</p>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div key={lead.id} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {lead.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {lead.email || "No email"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              lead.status === "converted"
                                ? "bg-green-500/20 text-green-400"
                                : lead.status === "qualified"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {lead.status || "new"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
            <p className="text-gray-400">
              Billing details and subscription management coming soon.
            </p>
          </div>
        );

      case "settings":
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Organization Settings
            </h3>
            <p className="text-gray-400">
              Organization configuration and preferences coming soon.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/organizations")}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <p className="text-sm text-gray-400">Organization Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Organization
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
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
      <div className="p-6">{renderTabContent()}</div>
    </div>
  );
}
