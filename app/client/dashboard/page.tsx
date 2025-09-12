"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Bell,
  CreditCard,
  LogOut,
} from "lucide-react";

interface Booking {
  id: string;
  class_session_id: string;
  status: string;
  booked_at: string;
  class_sessions: {
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    class_types: {
      name: string;
    };
    instructors: {
      name: string;
    };
  };
}

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  client_type: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      // First try to get the session from storage
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let user: any = null;

      // If no session in memory, try to restore from storage/cookies
      if (!session) {
        const { data: userData } = await supabase.auth.getUser();

        if (!userData.user) {
          router.push("/login-otp");
          return;
        }

        // If we have a user but no session, refresh the session
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession();

        if (!refreshedSession) {
          router.push("/login-otp");
          return;
        }

        user = userData.user;
      } else {
        user = session.user;
      }

      if (!user) {
        router.push("/login-otp");
        return;
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        // Try by email
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("*")
          .eq("email", user.email)
          .single();

        if (clientByEmail) {
          setClient(clientByEmail);
          await fetchBookings(clientByEmail.id);
        }
      } else {
        setClient(clientData);
        await fetchBookings(clientData.id);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (clientId: string) => {
    try {
      // First try with client_id (if table supports it)
      let { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          class_sessions (
            date,
            start_time,
            end_time,
            location,
            class_types (name),
            instructors (name)
          )
        `,
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      // If client_id doesn't work, try customer_id
      if (error && error.message?.includes("client_id")) {
        const result = await supabase
          .from("bookings")
          .select(
            `
            *,
            class_sessions (
              date,
              start_time,
              end_time,
              location,
              class_types (name),
              instructors (name)
            )
          `,
          )
          .eq("customer_id", clientId)
          .order("created_at", { ascending: false });

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error("Error fetching bookings:", error);
        // Continue without bookings rather than crashing
        setBookings([]);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setBookings([]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login-otp");
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      // Refresh bookings
      if (client) {
        await fetchBookings(client.id);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
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
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-400 hover:text-orange-500 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        {client && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-white">
              Welcome back, {client.first_name}!
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">
                    {client.first_name} {client.last_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Membership</p>
                  <p className="font-medium capitalize">
                    {client.client_type.replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/client/booking"
            className="bg-orange-600 text-white rounded-lg p-6 hover:bg-orange-700 transition-colors"
          >
            <Calendar className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">Book a Class</h3>
            <p className="text-blue-100 text-sm mt-1">
              View and book available classes
            </p>
          </Link>

          <Link
            href="/client/profile"
            className="bg-gray-600 text-white rounded-lg p-6 hover:bg-gray-700 transition-colors"
          >
            <User className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">My Profile</h3>
            <p className="text-gray-100 text-sm mt-1">
              Update your information
            </p>
          </Link>

          <Link
            href="/client/membership"
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
          >
            <CreditCard className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">Membership</h3>
            <p className="text-purple-100 text-sm mt-1">
              View membership details
            </p>
          </Link>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-white">My Bookings</h2>
          </div>
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isUpcoming =
                    new Date(booking.class_sessions.date) >= new Date();
                  const isCancelled = booking.status === "cancelled";

                  return (
                    <div
                      key={booking.id}
                      className={`border rounded-lg p-4 ${
                        isCancelled
                          ? "bg-gray-700 opacity-60"
                          : "hover:shadow-md transition-shadow"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">
                            {booking.class_sessions.class_types.name}
                          </h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {formatDate(booking.class_sessions.date)}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              {formatTime(
                                booking.class_sessions.start_time,
                              )} - {formatTime(booking.class_sessions.end_time)}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {booking.class_sessions.location || "Main Studio"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Instructor:{" "}
                              {booking.class_sessions.instructors.name}
                            </p>
                          </div>
                        </div>

                        <div className="ml-4">
                          {isCancelled ? (
                            <span className="text-sm text-red-600 font-medium">
                              Cancelled
                            </span>
                          ) : isUpcoming ? (
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  You haven't booked any classes yet
                </p>
                <Link
                  href="/client/booking"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Book Your First Class
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
