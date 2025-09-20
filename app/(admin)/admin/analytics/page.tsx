"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Platform performance and usage analytics
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Metrics Cards */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Organizations</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monthly Revenue</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Growth Rate</p>
                <p className="text-2xl font-bold">--%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold">User Growth</h3>
            </div>
            <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">
                Chart placeholder - User growth over time
              </p>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold">Activity Timeline</h3>
            </div>
            <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">
                Chart placeholder - Daily active users
              </p>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Revenue Analytics</h3>
            </div>
            <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">
                Chart placeholder - Revenue trends and forecasting
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
