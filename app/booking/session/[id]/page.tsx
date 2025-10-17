"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Mail,
  Phone,
} from "lucide-react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";

interface Attendee {
  id: string;
  customer_id: string;
  status: string;
  checked_in: boolean;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface ClassSession {
  id: string;
  program: {
    name: string;
  };
  start_time: string;
  end_time: string;
  instructor_name: string;
  location: string;
  capacity: number;
  bookings: Attendee[];
}

export default function SessionManagementPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const supabase = createClient();

      const { data: sessionData, error } = await supabase
        .from("class_sessions")
        .select(
          `
          *,
          program:programs(name),
          class_bookings(
            id,
            client_id,
            customer_id,
            booking_status,
            checked_in,
            client:clients(
              id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `,
        )
        .eq("id", sessionId)
        .eq("class_bookings.booking_status", "confirmed")
        .single();

      if (error) throw error;

      setSession(sessionData);
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckIn = async (bookingId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("class_bookings")
        .update({ checked_in: !currentStatus })
        .eq("id", bookingId);

      if (error) throw error;

      // Refresh session data
      fetchSessionDetails();
    } catch (error) {
      console.error("Error updating check-in status:", error);
    }
  };

  const filteredAttendees =
    session?.class_bookings?.filter((booking) => {
      const name = booking.client
        ? `${booking.client.first_name} ${booking.client.last_name}`.toLowerCase()
        : "";
      const email = booking.client?.email?.toLowerCase() || "";
      return (
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase())
      );
    }) || [];

  const checkedInCount =
    session?.class_bookings?.filter((b) => b.checked_in).length || 0;

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Session not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const startTime = new Date(session.start_time);

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {session.program.name}
                </h1>
                <p className="text-gray-400">
                  {startTime.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  at{" "}
                  {startTime.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(`/booking/session/${sessionId}/add-member`)
                }
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </div>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Instructor</p>
              <p className="text-lg font-medium">{session.instructor_name}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Location</p>
              <p className="text-lg font-medium">{session.location}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Bookings</p>
              <p className="text-lg font-medium">
                {session.class_bookings?.length || 0} / {session.max_capacity}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Checked In</p>
              <p className="text-lg font-medium">
                {checkedInCount} / {session.class_bookings?.length || 0}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search attendees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Attendees List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">
                Attendees ({filteredAttendees.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-700">
              {filteredAttendees.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          toggleCheckIn(booking.id, booking.checked_in)
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          booking.checked_in
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        {booking.checked_in ? (
                          <UserCheck className="w-5 h-5" />
                        ) : (
                          <UserX className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <p className="font-medium text-white">
                          {booking.client
                            ? `${booking.client.first_name} ${booking.client.last_name}`
                            : "Unknown Customer"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {booking.client?.email || "No email"}
                          </span>
                          {booking.client?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {booking.client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          booking.checked_in
                            ? "bg-green-900/30 text-green-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {booking.checked_in ? "Checked In" : "Not Checked In"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredAttendees.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  {searchTerm
                    ? "No attendees found matching your search"
                    : "No attendees booked yet"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
