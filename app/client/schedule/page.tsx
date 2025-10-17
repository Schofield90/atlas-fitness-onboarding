"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Filter,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  parseISO,
} from "date-fns";

export default function ClientSchedulePage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: "all",
    classType: "all",
    instructor: "all",
  });
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (client) {
      loadSessions();
    }
  }, [weekStart, client]);

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

  const loadSessions = async () => {
    if (!client || !client.org_id) {
      console.log("Client not loaded or missing org_id:", client);
      return;
    }

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    console.log("Loading sessions for org:", client.org_id);
    console.log(
      "Week range:",
      weekStart.toISOString(),
      "to",
      weekEnd.toISOString(),
    );

    const { data, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        programs (
          name,
          description
        )
      `,
      )
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .eq("organization_id", client.org_id)
      .order("start_time");

    if (error) {
      console.error("Error loading sessions:", error);
    } else {
      console.log("Loaded sessions:", data?.length || 0);
    }

    setSessions(data || []);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeekStart =
      direction === "prev" ? addDays(weekStart, -7) : addDays(weekStart, 7);
    setWeekStart(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  const getDaysOfWeek = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const getSessionsForDay = (date: Date) => {
    return sessions
      .filter((session) => isSameDay(parseISO(session.start_time), date))
      .filter((session) => {
        if (
          filters.location !== "all" &&
          session.location_id !== filters.location
        )
          return false;
        if (
          filters.classType !== "all" &&
          session.program_id !== filters.classType
        )
          return false;
        if (
          filters.instructor !== "all" &&
          session.instructor_id !== filters.instructor
        )
          return false;
        return true;
      });
  };

  const bookClass = async (sessionId: string) => {
    const response = await fetch("/api/booking/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classSessionId: sessionId,
        customerId: client.id,
        customerName: `${client.first_name} ${client.last_name}`,
        customerEmail: client.email,
        customerPhone: client.phone || "",
      }),
    });

    if (response.ok) {
      router.push("/client/bookings");
    } else {
      const error = await response.json();
      // Show the detailed message if available, otherwise the error
      alert(error.message || error.error || "Failed to book class");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const daysOfWeek = getDaysOfWeek();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/client")}
                className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">Class Schedule</h1>
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigateWeek("prev")}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-orange-500 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {format(weekStart, "MMM d")} -{" "}
              {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
            </h2>
            <button
              onClick={() => navigateWeek("next")}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-orange-500 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide">
            {daysOfWeek.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 min-w-[100px] py-4 px-4 text-center border-b-2 transition-colors ${
                  isSameDay(day, selectedDate)
                    ? "border-orange-500 bg-gray-700"
                    : "border-transparent hover:bg-gray-700"
                }`}
              >
                <div className="text-xs text-gray-400">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isSameDay(day, selectedDate)
                      ? "text-orange-500"
                      : "text-white"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classes List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {getSessionsForDay(selectedDate).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No classes scheduled for this day</p>
            </div>
          ) : (
            getSessionsForDay(selectedDate).map((session) => (
              <div
                key={session.id}
                className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {session.programs?.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            (session.current_bookings || 0) >=
                            session.max_capacity
                              ? "bg-red-900/50 text-red-400"
                              : (session.current_bookings || 0) >
                                  session.max_capacity * 0.8
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-green-900/50 text-green-400"
                          }`}
                        >
                          {(session.current_bookings || 0) >=
                          session.max_capacity
                            ? "Full"
                            : `${session.max_capacity - (session.current_bookings || 0)} spots left`}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span>
                            {(() => {
                              // Display time exactly as stored in UTC without timezone conversion
                              const startDate = new Date(session.start_time);
                              const endDate = new Date(session.end_time);
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
                        {session.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span>{session.location}</span>
                          </div>
                        )}
                        {session.instructor_name && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-orange-500" />
                            <span>{session.instructor_name}</span>
                          </div>
                        )}
                      </div>

                      {session.programs?.description && (
                        <p className="mt-3 text-sm text-gray-400">
                          {session.programs.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => bookClass(session.id)}
                      disabled={
                        (session.current_bookings || 0) >= session.max_capacity
                      }
                      className={`ml-4 px-6 py-2 rounded-lg font-medium transition-colors ${
                        (session.current_bookings || 0) >= session.max_capacity
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                    >
                      {(session.current_bookings || 0) >= session.max_capacity
                        ? "Full"
                        : "Book"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setFilterOpen(false)}
            />

            <div className="relative bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Filter Classes
                </h3>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) =>
                      setFilters({ ...filters, location: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Locations</option>
                    <option value="harrogate">Harrogate Studio</option>
                    <option value="york">York Studio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Class Type
                  </label>
                  <select
                    value={filters.classType}
                    onChange={(e) =>
                      setFilters({ ...filters, classType: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Classes</option>
                    <option value="hiit">HIIT</option>
                    <option value="yoga">Yoga</option>
                    <option value="strength">Strength</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instructor
                  </label>
                  <select
                    value={filters.instructor}
                    onChange={(e) =>
                      setFilters({ ...filters, instructor: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Instructors</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setFilters({
                      location: "all",
                      classType: "all",
                      instructor: "all",
                    });
                    setFilterOpen(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
