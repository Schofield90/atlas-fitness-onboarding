"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { AttendanceStatsWidget } from "@/app/components/dashboard/AttendanceStatsWidget";
import { PaymentStatsWidget } from "@/app/components/dashboard/PaymentStatsWidget";
import {
  Calendar,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  MessageSquare,
  Settings,
  BarChart3,
  Shield,
} from "lucide-react";

export default function OrgDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Call API endpoint to check auth from httpOnly cookies
        const response = await fetch("/api/auth/user");

        if (!response.ok) {
          router.push("/owner-login");
          return;
        }

        const { user: currentUser } = await response.json();

        if (!currentUser) {
          router.push("/owner-login");
          return;
        }

        setUser(currentUser);

        // Check if user is admin
        if (
          currentUser.role === "super_admin" ||
          currentUser.role === "admin"
        ) {
          setIsAdmin(true);
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/owner-login");
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={user}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome to Atlas Fitness CRM
              </h1>
              <p className="text-gray-300">
                Manage your gym operations from one central location
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => router.push("/admin/simple-dashboard")}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Shield className="h-5 w-5" />
                Admin Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <p className="text-2xl font-bold">127</p>
            <p className="text-sm text-gray-400">Active Members</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">TODAY</span>
            </div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-gray-400">Classes Scheduled</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <p className="text-2xl font-bold">£5,432</p>
            <p className="text-sm text-gray-400">Revenue</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <span className="text-xs text-gray-400">GROWTH</span>
            </div>
            <p className="text-2xl font-bold">+12%</p>
            <p className="text-sm text-gray-400">vs Last Month</p>
          </div>
        </div>

        {/* Navigation Grid - Updated with path-based URLs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push(`/org/${orgSlug}/leads`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Users className="h-8 w-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Leads & Customers</h3>
            <p className="text-gray-400 text-sm">
              Manage your leads and customer profiles
            </p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/booking`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Calendar className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Class Schedule</h3>
            <p className="text-gray-400 text-sm">
              View and manage class bookings
            </p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/billing`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <DollarSign className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Billing & Payments</h3>
            <p className="text-gray-400 text-sm">
              Track payments and subscriptions
            </p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/classes/recurring`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Recurring Classes</h3>
            <p className="text-gray-400 text-sm">
              Set up recurring class schedules
            </p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/conversations`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <MessageSquare className="h-8 w-8 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Communications</h3>
            <p className="text-gray-400 text-sm">
              Send WhatsApp & SMS messages
            </p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/analytics`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <BarChart3 className="h-8 w-8 text-indigo-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm">View business insights</p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/automations`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Automations</h3>
            <p className="text-gray-400 text-sm">Workflow automation</p>
          </button>

          <button
            onClick={() => router.push(`/org/${orgSlug}/settings`)}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Settings className="h-8 w-8 text-gray-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">Configure your system</p>
          </button>
        </div>

        {/* Attendance Statistics */}
        <div className="mt-8">
          <AttendanceStatsWidget />
        </div>

        {/* Payment Statistics */}
        <div className="mt-8">
          <PaymentStatsWidget />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    New member signed up: John Smith
                  </span>
                </div>
                <span className="text-xs text-gray-400">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Class booked: Yoga with Sarah</span>
                </div>
                <span className="text-xs text-gray-400">15 minutes ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">
                    Payment received: £45 from Emily Johnson
                  </span>
                </div>
                <span className="text-xs text-gray-400">1 hour ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Lead converted: Michael Brown</span>
                </div>
                <span className="text-xs text-gray-400">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
