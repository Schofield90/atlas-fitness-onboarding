"use client";

import { Calendar, Clock, MapPin, Users, ChevronLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { format, parseISO, differenceInHours } from "date-fns";

export default function ClientBookingsPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (client) {
      loadBookings();
    }
  }, [client]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/simple-login");
      return;
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!clientData) {
      router.push("/simple-login");
      return;
    }

    setClient(clientData);
    setLoading(false);
  };

  const loadBookings = async () => {
    console.log("Loading bookings for client:", client.id, client.email);

    // Fetch bookings via API to bypass RLS issues
    try {
      const response = await fetch("/api/client-bookings");
      if (!response.ok) {
        console.error("Failed to fetch bookings:", await response.text());
        setBookings([]);
        return;
      }

      const { bookings: apiBookings } = await response.json();
      console.log("API bookings:", apiBookings);

      let allBookings = apiBookings || [];

      // Also get from class_bookings table for legacy bookings
      const { data: classBookings, error: classBookingsError } = await supabase
        .from("class_bookings")
        .select(
          `
          *,
          class_sessions (
            *,
            programs (
              name,
              description
            )
          )
        `,
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      console.log(
        "Class bookings:",
        classBookings,
        "Error:",
        classBookingsError,
      );

      if (classBookings && classBookings.length > 0) {
        // Map class_bookings fields to match bookings structure
        const mappedClassBookings = classBookings.map((cb) => ({
          ...cb,
          status: cb.booking_status || "confirmed",
          booking_date: cb.created_at?.split("T")[0],
        }));
        allBookings = [...allBookings, ...mappedClassBookings];
      }

      // If we still need to check for lead-based bookings (backward compatibility)
      if (allBookings.length === 0) {
        console.log("No direct bookings, checking lead records...");
        const { data: leadData } = await supabase
          .from("leads")
          .select("id")
          .eq("client_id", client.id)
          .single();

        if (leadData) {
          // Get bookings using the lead ID from BOTH tables
          const { data: leadBookings } = await supabase
            .from("class_bookings")
            .select(
              `
            *,
            class_sessions (
              *,
              programs (
                name,
                description
              )
            )
          `,
            )
            .eq("customer_id", leadData.id)
            .order("created_at", { ascending: false });

          const { data: leadClassBookings } = await supabase
            .from("class_bookings")
            .select(
              `
            *,
            class_sessions (
              *,
              programs (
                name,
                description
              )
            )
          `,
            )
            .eq("customer_id", leadData.id)
            .eq("booking_status", "confirmed")
            .order("created_at", { ascending: false });

          // Combine all bookings
          if (leadBookings) {
            allBookings = [...allBookings, ...leadBookings];
          }
          if (leadClassBookings) {
            const mappedClassBookings = leadClassBookings.map((cb) => ({
              ...cb,
              status: cb.booking_status || "confirmed",
              booking_date: cb.created_at?.split("T")[0],
            }));
            allBookings = [...allBookings, ...mappedClassBookings];
          }

          // Get credits from lead record
          const { data: credits } = await supabase
            .from("class_credits")
            .select("credits_remaining")
            .eq("customer_id", leadData.id)
            .single();

          if (credits) {
            setCreditsRemaining(credits.credits_remaining);
          }
        } else {
          // Final fallback: Try to find lead by email
          console.log("No lead by client_id, trying by email:", client.email);
          const { data: leadByEmail } = await supabase
            .from("leads")
            .select("id")
            .eq("email", client.email)
            .eq("organization_id", client.organization_id)
            .single();

          console.log("Lead by email:", leadByEmail);

          if (leadByEmail) {
            const { data: emailBookings } = await supabase
              .from("class_bookings")
              .select(
                `
              *,
              class_sessions (
                *,
                programs (
                  name,
                  description
                ),
              )
            `,
              )
              .eq("customer_id", leadByEmail.id)
              .order("created_at", { ascending: false });

            const { data: emailClassBookings } = await supabase
              .from("class_bookings")
              .select(
                `
              *,
              class_sessions (
                *,
                programs (
                  name,
                  description
                ),
              )
            `,
              )
              .eq("customer_id", leadByEmail.id)
              .eq("booking_status", "confirmed")
              .order("created_at", { ascending: false });

            console.log(
              "Email-based bookings:",
              emailBookings,
              emailClassBookings,
            );

            if (emailBookings) {
              allBookings = [...allBookings, ...emailBookings];
            }
            if (emailClassBookings) {
              const mappedClassBookings = emailClassBookings.map((cb) => ({
                ...cb,
                status: cb.booking_status || "confirmed",
                booking_date: cb.created_at?.split("T")[0],
              }));
              allBookings = [...allBookings, ...mappedClassBookings];
            }

            // Get credits
            const { data: emailCredits } = await supabase
              .from("class_credits")
              .select("credits_remaining")
              .eq("customer_id", leadByEmail.id)
              .single();

            if (emailCredits) {
              setCreditsRemaining(emailCredits.credits_remaining);
            }
          }
        }
      }

      // Set all combined bookings
      setBookings(allBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
    }

    // Try to get credits directly for client
    const { data: credits } = await supabase
      .from("class_credits")
      .select("credits_remaining")
      .eq("client_id", client.id)
      .single();

    if (credits) {
      setCreditsRemaining(credits.credits_remaining);
    } else {
      // Fallback to lead-based credits
      const { data: leadData } = await supabase
        .from("leads")
        .select("id")
        .eq("client_id", client.id)
        .single();

      if (leadData) {
        const { data: leadCredits } = await supabase
          .from("class_credits")
          .select("credits_remaining")
          .eq("customer_id", leadData.id)
          .single();

        if (leadCredits) {
          setCreditsRemaining(leadCredits.credits_remaining);
        }
      }
    }
  };

  const canCancelBooking = (booking: any) => {
    const classTime = parseISO(booking.class_sessions.start_time);
    const hoursUntilClass = differenceInHours(classTime, new Date());
    return hoursUntilClass >= 24;
  };

  const cancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch("/api/client-bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selectedBooking.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel booking");
      }

      setCancelModalOpen(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking: " + (error as any).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter((b) => {
    if (!b.class_sessions?.start_time) {
      console.log("Booking filtered out - no start_time:", b);
      return false;
    }
    const classTime = new Date(b.class_sessions.start_time);
    const now = new Date();
    const isUpcoming = classTime > now;
    const isConfirmed = b.status === "confirmed";

    console.log(`Booking ${b.id}:`, {
      start_time: b.class_sessions.start_time,
      classTime: classTime.toISOString(),
      now: now.toISOString(),
      isUpcoming,
      status: b.status,
      isConfirmed,
      willShow: isUpcoming && isConfirmed
    });

    return isUpcoming && isConfirmed;
  });

  const pastBookings = bookings.filter((b) => {
    if (!b.class_sessions?.start_time) return false;
    const classTime = new Date(b.class_sessions.start_time);
    const now = new Date();
    return (
      classTime <= now || b.status === "attended" || b.status === "no_show"
    );
  });

  const cancelledBookings = bookings.filter((b) => {
    return b.status === "cancelled";
  });

  // Only count attended classes, not cancelled ones
  const attendedCount = pastBookings.filter(
    (b) => b.status === "attended",
  ).length;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push("/client")}
              className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">My Classes</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-2xl font-bold text-white">
              {upcomingBookings.length}
            </div>
            <div className="text-sm text-gray-400">Upcoming Classes</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-2xl font-bold text-white">
              {creditsRemaining}
            </div>
            <div className="text-sm text-gray-400">Credits Remaining</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-2xl font-bold text-white">{attendedCount}</div>
            <div className="text-sm text-gray-400">Classes Attended</div>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Upcoming Classes
          </h2>
          {upcomingBookings.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center">
              <Calendar className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                You don't have any upcoming classes
              </p>
              <button
                onClick={() => router.push("/client/schedule")}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Book a Class
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:border-orange-500 transition-all"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {booking.class_sessions.programs?.name}
                        </h3>

                        <div className="space-y-1 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(
                                parseISO(booking.class_sessions.start_time),
                                "EEEE, MMMM d, yyyy",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {(() => {
                                const startDate = new Date(
                                  booking.class_sessions.start_time,
                                );
                                const endDate = new Date(
                                  booking.class_sessions.end_time,
                                );
                                const startHours = startDate
                                  .getUTCHours()
                                  .toString()
                                  .padStart(2, "0");
                                const startMinutes = startDate
                                  .getUTCMinutes()
                                  .toString()
                                  .padStart(2, "0");
                                const endHours = endDate
                                  .getUTCHours()
                                  .toString()
                                  .padStart(2, "0");
                                const endMinutes = endDate
                                  .getUTCMinutes()
                                  .toString()
                                  .padStart(2, "0");
                                return `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
                              })()}
                            </span>
                          </div>
                          {booking.class_sessions.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.class_sessions.location}</span>
                            </div>
                          )}
                          {booking.class_sessions.instructor_name && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {booking.class_sessions.instructor_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-2">
                        <span className="bg-green-900/50 text-green-400 text-xs font-medium px-2.5 py-0.5 rounded">
                          Confirmed
                        </span>
                        {canCancelBooking(booking) ? (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setCancelModalOpen(true);
                            }}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Cannot cancel within 24 hours
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Classes */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Past Classes
            </h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 opacity-75"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {booking.class_sessions.programs?.name}
                        </h3>

                        <div className="space-y-1 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(
                                parseISO(booking.class_sessions.start_time),
                                "EEEE, MMMM d, yyyy",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {booking.class_sessions.organization_staff?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded ${
                          booking.status === "attended"
                            ? "bg-blue-900/50 text-blue-400"
                            : booking.status === "cancelled"
                              ? "bg-red-900/50 text-red-400"
                              : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {booking.status === "attended"
                          ? "Attended"
                          : booking.status === "cancelled"
                            ? "Cancelled"
                            : "Missed"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {cancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setCancelModalOpen(false)}
            />

            <div className="relative bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Cancel Class
                </h3>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to cancel your booking for:
                </p>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white">
                    {selectedBooking.class_sessions.programs?.name}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {format(
                      parseISO(selectedBooking.class_sessions.start_time),
                      "EEEE, MMMM d",
                    )}{" "}
                    at{" "}
                    {(() => {
                      const date = new Date(
                        selectedBooking.class_sessions.start_time,
                      );
                      const hours = date
                        .getUTCHours()
                        .toString()
                        .padStart(2, "0");
                      const minutes = date
                        .getUTCMinutes()
                        .toString()
                        .padStart(2, "0");
                      return `${hours}:${minutes}`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  onClick={cancelBooking}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
