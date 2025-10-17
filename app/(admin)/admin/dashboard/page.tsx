"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Cpu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "@/lib/toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalRevenue: 0,
    systemHealth: "healthy",
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if user is logged in first
    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user is authorized (allow both admin emails)
    const authorizedEmails = ["sam@gymleadhub.co.uk", "sam@atlas-gyms.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      toast.error("Unauthorized access - Admin only");
      // Redirect to dashboard-direct to avoid auth loops
      router.push("/dashboard-direct");
      return;
    }

    setUser(user);
  };

  const fetchStats = async () => {
    try {
      // Fetch organization stats
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, created_at, subscription_status");

      const { data: users } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("is_active", true);

      const { data: leads } = await supabase.from("leads").select("id");

      // Calculate stats - count unique users
      const uniqueUsers = new Set(users?.map((u) => u.user_id) || []);
      setStats({
        totalOrgs: orgs?.length || 0,
        activeOrgs:
          orgs?.filter((o) => o.subscription_status === "active").length || 0,
        totalUsers: uniqueUsers.size,
        totalLeads: leads?.length || 0,
        totalRevenue: 0, // Would come from Stripe
        systemHealth: "healthy",
        recentOrgs: orgs?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">
              SaaS Admin Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Platform administration and monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">{user?.email}</div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Organizations"
            value={stats.totalOrgs}
            icon={<Building2 className="w-6 h-6" />}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            title="Active Organizations"
            value={stats.activeOrgs}
            icon={<Activity className="w-6 h-6" />}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users className="w-6 h-6" />}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={<TrendingUp className="w-6 h-6" />}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              System Health
            </h2>
            <div className="space-y-3">
              <HealthItem label="API Status" status="healthy" />
              <HealthItem label="Database" status="healthy" />
              <HealthItem label="Redis Cache" status="warning" />
              <HealthItem label="Email Service" status="healthy" />
              <HealthItem label="Twilio SMS" status="healthy" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Recent Organizations
            </h2>
            <div className="space-y-2">
              {stats.recentOrgs?.map((org: any) => (
                <div
                  key={org.id}
                  className="flex justify-between items-center py-2 border-b border-gray-700"
                >
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      router.push(`/admin/organizations/${org.id}`)
                    }
                    className="text-sm text-purple-500 hover:text-purple-400"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/admin/organizations")}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Manage Organizations
              </button>
              <button
                onClick={() => router.push("/admin/billing")}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Billing & Subscriptions
              </button>
              <button
                onClick={() => router.push("/admin/impersonation")}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                User Impersonation
              </button>
              <button
                onClick={() => router.push("/admin/system")}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                System Settings
              </button>
              <button
                onClick={() => router.push("/admin/landing-pages")}
                className="w-full text-left px-4 py-2 bg-purple-700 rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                Landing Page Builder
              </button>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Platform Activity
          </h2>
          <div className="space-y-3">
            <ActivityItem
              time="2 minutes ago"
              text="New organization registered: FitLife Gym"
              type="success"
            />
            <ActivityItem
              time="15 minutes ago"
              text="Atlas Fitness upgraded to Premium plan"
              type="info"
            />
            <ActivityItem
              time="1 hour ago"
              text="System backup completed successfully"
              type="success"
            />
            <ActivityItem
              time="2 hours ago"
              text="Redis cache connection warning"
              type="warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

function HealthItem({ label, status }: any) {
  const getStatusIcon = () => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span
          className={`text-xs ${
            status === "healthy"
              ? "text-green-500"
              : status === "warning"
                ? "text-yellow-500"
                : status === "error"
                  ? "text-red-500"
                  : "text-gray-500"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ time, text, type }: any) {
  const getTypeIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-700 last:border-0">
      {getTypeIcon()}
      <div className="flex-1">
        <div className="text-sm">{text}</div>
        <div className="text-xs text-gray-500">{time}</div>
      </div>
    </div>
  );
}
