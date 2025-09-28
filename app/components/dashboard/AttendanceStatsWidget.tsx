"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { Activity, TrendingUp, Users, Calendar } from "lucide-react";

interface AttendanceStats {
  totalAttendances: number;
  uniqueClients: number;
  todayAttendances: number;
  weeklyAttendances: number;
  monthlyAttendances: number;
  topAttendees: { name: string; count: number }[];
}

export function AttendanceStatsWidget() {
  const [stats, setStats] = useState<AttendanceStats>({
    totalAttendances: 0,
    uniqueClients: 0,
    todayAttendances: 0,
    weeklyAttendances: 0,
    monthlyAttendances: 0,
    topAttendees: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceStats();
  }, []);

  const fetchAttendanceStats = async () => {
    try {
      // Get organization via API to avoid RLS issues
      const response = await fetch('/api/auth/get-organization', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.log("AttendanceStats: Not authenticated or failed to get organization");
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (!result.success || !result.data.organizationId) {
        console.log("AttendanceStats: No organization for user");
        setLoading(false);
        return;
      }

      const organizationId = result.data.organizationId;
      const supabase = createClient();

      // Fetch all attendance records
      const { data: bookings, error } = await supabase
        .from("class_bookings")
        .select(
          `
          id,
          client_id,
          attended_at,
          booking_date,
          booking_type,
          clients!class_bookings_client_id_fkey(name)
        `,
        )
        .eq("organization_id", organizationId)
        .not("attended_at", "is", null);

      if (error) {
        console.error("Error fetching attendance stats:", error);
        setLoading(false);
        return;
      }

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      let todayCount = 0;
      let weekCount = 0;
      let monthCount = 0;
      const clientAttendances: Record<string, { name: string; count: number }> =
        {};
      const uniqueClientIds = new Set<string>();

      bookings?.forEach((booking) => {
        const attendanceDate = new Date(booking.attended_at);

        // Count by time period
        if (attendanceDate >= today) {
          todayCount++;
        }
        if (attendanceDate >= weekAgo) {
          weekCount++;
        }
        if (attendanceDate >= monthAgo) {
          monthCount++;
        }

        // Track unique clients
        if (booking.client_id) {
          uniqueClientIds.add(booking.client_id);

          // Count attendances per client
          const clientName = booking.clients?.name || "Unknown";
          if (!clientAttendances[booking.client_id]) {
            clientAttendances[booking.client_id] = {
              name: clientName,
              count: 0,
            };
          }
          clientAttendances[booking.client_id].count++;
        }
      });

      // Get top 5 attendees
      const topAttendees = Object.values(clientAttendances)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalAttendances: bookings?.length || 0,
        uniqueClients: uniqueClientIds.size,
        todayAttendances: todayCount,
        weeklyAttendances: weekCount,
        monthlyAttendances: monthCount,
        topAttendees,
      });
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-700 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-orange-500" />
          Attendance Overview
        </h2>
        <span className="text-sm text-gray-400">
          {stats.uniqueClients} active members
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total</span>
            <Activity className="h-4 w-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.totalAttendances}
          </p>
          <p className="text-xs text-gray-500">All time</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Today</span>
            <Calendar className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.todayAttendances}
          </p>
          <p className="text-xs text-gray-500">Attendances</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">This Week</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.weeklyAttendances}
          </p>
          <p className="text-xs text-gray-500">7 days</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">This Month</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.monthlyAttendances}
          </p>
          <p className="text-xs text-gray-500">30 days</p>
        </div>
      </div>

      {/* Top Attendees */}
      {stats.topAttendees.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Top Attendees
          </h3>
          <div className="space-y-2">
            {stats.topAttendees.map((attendee, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6">
                    {index + 1}.
                  </span>
                  <span className="text-sm text-white">{attendee.name}</span>
                </div>
                <span className="text-sm text-orange-500 font-medium">
                  {attendee.count} visits
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
