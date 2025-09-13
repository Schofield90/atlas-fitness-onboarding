"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import SharedStaffCalendar from "@/app/components/staff/SharedStaffCalendar";
import { createClient } from "@/app/lib/supabase/client";
import { useOrganization } from "@/app/hooks/useOrganization";
import { 
  Calendar,
  Users,
  Dumbbell,
  Clock,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronRight
} from "lucide-react";

export default function StaffCalendarPage() {
  const { organizationId } = useOrganization();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekBookings: 0,
    gymUtilization: 0,
    upcomingPT: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        if (organizationId) {
          // Fetch today's bookings count
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const { count: todayCount } = await supabase
            .from("staff_calendar_bookings")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .gte("start_time", today.toISOString())
            .lt("start_time", tomorrow.toISOString())
            .neq("status", "cancelled");

          // Fetch this week's bookings
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const { count: weekCount } = await supabase
            .from("staff_calendar_bookings")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .gte("start_time", weekStart.toISOString())
            .lt("start_time", weekEnd.toISOString())
            .neq("status", "cancelled");

          // Fetch upcoming PT sessions
          const { count: ptCount } = await supabase
            .from("staff_calendar_bookings")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("booking_type", "pt_session_121")
            .gte("start_time", today.toISOString())
            .neq("status", "cancelled");

          // Calculate gym utilization (simplified)
          const utilizationPercentage = Math.min(100, ((todayCount || 0) / 20) * 100); // Assuming 20 slots is full

          setStats({
            todayBookings: todayCount || 0,
            weekBookings: weekCount || 0,
            gymUtilization: Math.round(utilizationPercentage),
            upcomingPT: ptCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndStats();
  }, [organizationId, supabase]);

  if (!organizationId || !currentUserId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-white">Loading calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-gray-900">
        {/* Header with Stats */}
        <div className="bg-gray-800 border-b border-gray-700 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Staff Calendar</h1>
                <p className="text-gray-400 mt-1">Manage gym floor time, PT sessions, and staff schedules</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Today's Bookings</p>
                    <p className="text-2xl font-bold text-white">{stats.todayBookings}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">This Week</p>
                    <p className="text-2xl font-bold text-white">{stats.weekBookings}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Gym Utilization</p>
                    <p className="text-2xl font-bold text-white">{stats.gymUtilization}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats.gymUtilization}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming PT</p>
                    <p className="text-2xl font-bold text-white">{stats.upcomingPT}</p>
                  </div>
                  <Dumbbell className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-4 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-400 font-medium">Quick Tips</p>
                  <ul className="text-sm text-gray-400 mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Click any empty slot to book gym time
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Group classes are automatically synced from the class schedule
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Use filters to view specific staff members or booking types
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Color coding: Blue = PT, Green = Classes, Amber = Gym Floor
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Component */}
        <div className="flex-1 overflow-hidden">
          <SharedStaffCalendar
            organizationId={organizationId}
            currentUserId={currentUserId}
            initialView="week"
            allowEditing={true}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}