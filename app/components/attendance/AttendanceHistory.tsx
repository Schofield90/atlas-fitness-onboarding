"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { Calendar, Activity, TrendingUp, Clock } from "lucide-react";

interface AttendanceRecord {
  id: string;
  booking_date: string;
  booking_time: string;
  attended_at: string;
  notes: string;
  booking_type: string;
  booking_status: string;
}

interface AttendanceHistoryProps {
  clientId: string;
  clientName?: string;
}

export function AttendanceHistory({
  clientId,
  clientName,
}: AttendanceHistoryProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [currentMonthAttendance, setCurrentMonthAttendance] = useState(0);
  const [lastAttendance, setLastAttendance] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchAttendance();
    }
  }, [clientId]);

  const fetchAttendance = async () => {
    try {
      const supabase = createClient();

      // Get user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Fetch attendance records
      const { data: bookings, error } = await supabase
        .from("class_bookings")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("client_id", clientId)
        .not("attended_at", "is", null)
        .order("attended_at", { ascending: false });

      if (error) {
        console.error("Error fetching attendance:", error);
        return;
      }

      setAttendance(bookings || []);
      setTotalAttendance(bookings?.length || 0);

      // Calculate current month attendance
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthAttendance =
        bookings?.filter((booking) => {
          const date = new Date(booking.attended_at);
          return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          );
        }).length || 0;
      setCurrentMonthAttendance(monthAttendance);

      // Get last attendance date
      if (bookings && bookings.length > 0) {
        setLastAttendance(bookings[0].attended_at);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    // Handle time in HH:MM format
    if (timeString.match(/^\d{2}:\d{2}/)) {
      return timeString;
    }
    // Handle full datetime
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysSinceLastAttendance = () => {
    if (!lastAttendance) return null;
    const last = new Date(lastAttendance);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const displayedAttendance = showAll ? attendance : attendance.slice(0, 10);
  const daysSinceLastAttendance = getDaysSinceLastAttendance();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Attendance History
          </h3>
          <span className="text-sm text-gray-500">
            {clientName || "Client"}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Total Attendance
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalAttendance}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {currentMonthAttendance}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  Last Visit
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {daysSinceLastAttendance !== null
                    ? `${daysSinceLastAttendance} day${daysSinceLastAttendance !== 1 ? "s" : ""} ago`
                    : "Never"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="p-6">
        {attendance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No attendance records found</p>
            <p className="text-sm mt-1">
              Import attendance data to see history
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedAttendance.map((record) => {
                const isImported = record.booking_type === "attendance_import";
                const className =
                  record.notes?.match(
                    /Imported attendance: (.+?)(?:\s\(|$)/,
                  )?.[1] || "Class Session";

                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{className}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(record.attended_at)}
                          {record.booking_time &&
                            ` at ${formatTime(record.booking_time)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isImported && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          Imported
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Attended
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {attendance.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showAll
                    ? "Show Less"
                    : `Show All (${attendance.length} records)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
