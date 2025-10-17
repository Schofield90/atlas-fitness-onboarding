"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  X,
  Calendar,
  Clock,
  Repeat,
  User,
  Settings,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import { formatBritishDate } from "@/app/lib/utils/british-format";

interface RecurringBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  organizationId: string;
  onRecurringBookingCreated?: () => void;
}

interface WeeklySession {
  id: string;
  program_id: string;
  program_name: string;
  instructor_name?: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  room_location?: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  time_slot: string; // HH:MM format
  duration_minutes: number;
}

interface ClassType {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  specialties?: string[];
}

interface SelectedSession {
  sessionId: string;
  dayOfWeek: number;
  timeSlot: string;
  programName: string;
  instructor?: string;
  location?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TIME_SLOTS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

const formatPrice = (pennies: number) => {
  return `£${(pennies / 100).toFixed(2)}`;
};

export default function RecurringBookingModal({
  isOpen,
  onClose,
  customerId,
  organizationId,
  onRecurringBookingCreated,
}: RecurringBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [customer, setCustomer] = useState<any>(null);
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<SelectedSession[]>(
    [],
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<
    Map<string, WeeklySession[]>
  >(new Map());
  const [totalBookingsCreated, setTotalBookingsCreated] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchCustomerDetails();
      fetchWeeklySchedule();
      resetForm();
      // Set default start date to next Monday
      const today = new Date();
      const nextMonday = new Date(today);
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      setStartDate(nextMonday.toISOString().split("T")[0]);

      // Set default end date to 3 months from start
      const threeMonthsLater = new Date(nextMonday);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      setEndDate(threeMonthsLater.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedSessions([]);
    setStep("select");
  };

  const fetchWeeklySchedule = async () => {
    try {
      setLoadingSchedule(true);

      // Get the next 7 days of classes to show the weekly pattern
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data: sessions, error } = await supabase
        .from("class_sessions")
        .select(
          `
          id,
          program_id,
          instructor_name,
          start_time,
          end_time,
          max_capacity,
          current_bookings,
          room_location,
          programs!inner(
            name,
            description
          )
        `,
        )
        .eq("organization_id", organizationId)
        .gte("start_time", today.toISOString())
        .lte("start_time", nextWeek.toISOString())
        .order("start_time");

      if (error) throw error;

      // Process sessions into weekly schedule
      const processedSessions: WeeklySession[] = (sessions || []).map(
        (session) => {
          const startDate = new Date(session.start_time);
          const endDate = new Date(session.end_time);
          const dayOfWeek = startDate.getDay();
          const timeSlot = startDate.toTimeString().substring(0, 5);
          const durationMinutes = Math.round(
            (endDate.getTime() - startDate.getTime()) / 60000,
          );

          return {
            id: session.id,
            program_id: session.program_id,
            program_name: session.programs?.name || "Unknown Class",
            instructor_name: session.instructor_name,
            start_time: session.start_time,
            end_time: session.end_time,
            max_capacity: session.max_capacity || 15,
            current_bookings: session.current_bookings || 0,
            room_location: session.room_location,
            day_of_week: dayOfWeek,
            time_slot: timeSlot,
            duration_minutes: durationMinutes,
          };
        },
      );

      setWeeklySessions(processedSessions);

      // Group sessions by day and time for the grid
      const schedule = new Map<string, WeeklySession[]>();
      processedSessions.forEach((session) => {
        const key = `${session.day_of_week}-${session.time_slot}`;
        if (!schedule.has(key)) {
          schedule.set(key, []);
        }
        schedule.get(key)!.push(session);
      });

      setWeeklySchedule(schedule);
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      // First try to fetch from clients table
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();

      if (clientData) {
        setCustomer({ ...clientData, type: "client" });
        return;
      }

      // If not found in clients, try leads table
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();

      if (leadData) {
        setCustomer({ ...leadData, type: "lead" });
        return;
      }

      throw new Error("Customer not found in either clients or leads table");
    } catch (error) {
      console.error("Error fetching customer details:", error);
      alert("Failed to load customer details. Please try again.");
    }
  };

  const toggleSessionSelection = (session: WeeklySession) => {
    const sessionKey = `${session.day_of_week}-${session.time_slot}`;
    const existingIndex = selectedSessions.findIndex(
      (s) =>
        s.dayOfWeek === session.day_of_week && s.timeSlot === session.time_slot,
    );

    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedSessions((prev) =>
        prev.filter((_, index) => index !== existingIndex),
      );
    } else {
      // Add to selection
      setSelectedSessions((prev) => [
        ...prev,
        {
          sessionId: session.id,
          dayOfWeek: session.day_of_week,
          timeSlot: session.time_slot,
          programName: session.program_name,
          instructor: session.instructor_name,
          location: session.room_location,
        },
      ]);
    }
  };

  const isSessionSelected = (dayOfWeek: number, timeSlot: string) => {
    return selectedSessions.some(
      (s) => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot,
    );
  };

  const calculateTotalBookings = () => {
    if (!startDate || !endDate || selectedSessions.length === 0) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.ceil(
      (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    return selectedSessions.length * weeks;
  };

  const generateBookingDates = () => {
    if (!startDate || !endDate || selectedSessions.length === 0) return [];

    const bookingDates: Array<{ session: SelectedSession; date: Date }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    selectedSessions.forEach((session) => {
      let current = new Date(start);

      // Find the first occurrence of this day of week
      while (current.getDay() !== session.dayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      // Add all occurrences until end date
      while (current <= end) {
        bookingDates.push({
          session,
          date: new Date(current),
        });
        current.setDate(current.getDate() + 7); // Move to next week
      }
    });

    return bookingDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const validateForm = () => {
    if (selectedSessions.length === 0) {
      return {
        isValid: false,
        error:
          "Please select at least one class session from the weekly schedule",
      };
    }
    if (!startDate) {
      return { isValid: false, error: "Please select a start date" };
    }
    if (!endDate) {
      return { isValid: false, error: "Please select an end date" };
    }
    return { isValid: true, error: null };
  };

  const handleCreateRecurringBookings = async () => {
    try {
      setLoading(true);

      const validation = validateForm();
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      if (!customer) throw new Error("Customer data not loaded");

      // Prepare sessions with program IDs
      const sessionsWithProgramIds = selectedSessions.map((session) => {
        // Find the matching weekly session to get program_id
        const targetSession = weeklySessions.find(
          (s) =>
            s.day_of_week === session.dayOfWeek &&
            s.time_slot === session.timeSlot,
        );

        return {
          ...session,
          programId: targetSession?.program_id || "",
        };
      });

      console.log("Creating recurring bookings for 3 months:", {
        customerId,
        organizationId,
        selectedSessions: sessionsWithProgramIds,
        startDate,
        endDate,
      });

      // Call the API endpoint to create recurring bookings
      const response = await fetch("/api/booking/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          organizationId,
          selectedSessions: sessionsWithProgramIds,
          startDate,
          endDate,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("API error:", result.error);
        alert(`Failed to create bookings: ${result.error}`);
        return;
      }

      console.log("Successfully created recurring bookings:", result);

      // Store the number of bookings created
      setTotalBookingsCreated(result.data?.length || 0);

      setStep("success");
      onRecurringBookingCreated?.();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error("Error creating recurring bookings:", error);
      alert("Failed to create recurring bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const validation = validateForm();
  const bookingDates = step === "confirm" ? generateBookingDates() : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === "select" && "Select Weekly Class Schedule"}
            {step === "confirm" && "Confirm Recurring Bookings"}
            {step === "success" && "Recurring Bookings Created"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "select" && (
            <div className="space-y-6">
              {/* Customer Info */}
              {customer && (
                <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-medium text-white mb-1">
                      Setting up recurring bookings for:
                    </h4>
                    <p className="text-gray-300">
                      {customer.first_name || customer.name}{" "}
                      {customer.last_name || ""}
                    </p>
                    <p className="text-gray-400 text-sm">{customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Selected Classes</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedSessions.length}
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-300 font-medium mb-1">
                      Select Your Weekly Schedule
                    </h4>
                    <p className="text-blue-200 text-sm">
                      Choose the classes you want to attend each week. These
                      will be automatically booked for you for the next 3
                      months.
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Schedule Grid */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Weekly Class Schedule
                </h3>

                {loadingSchedule ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 py-2 sticky left-0 bg-gray-900 z-10">
                            Time
                          </th>
                          {DAYS_OF_WEEK.map((day) => (
                            <th
                              key={day.value}
                              className="text-center text-xs font-medium text-gray-400 uppercase px-2 py-2 min-w-[120px]"
                            >
                              {day.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((timeSlot) => {
                          // Check if any day has a class at this time
                          const hasClassesAtTime = DAYS_OF_WEEK.some((day) => {
                            const key = `${day.value}-${timeSlot}`;
                            return weeklySchedule.has(key);
                          });

                          if (!hasClassesAtTime) return null;

                          return (
                            <tr
                              key={timeSlot}
                              className="border-t border-gray-700"
                            >
                              <td className="text-sm text-gray-300 px-2 py-2 sticky left-0 bg-gray-900 z-10 font-medium">
                                {timeSlot}
                              </td>
                              {DAYS_OF_WEEK.map((day) => {
                                const key = `${day.value}-${timeSlot}`;
                                const sessions = weeklySchedule.get(key) || [];
                                const isSelected = isSessionSelected(
                                  day.value,
                                  timeSlot,
                                );

                                if (sessions.length === 0) {
                                  return (
                                    <td key={day.value} className="px-2 py-2">
                                      <div className="h-20 bg-gray-800/50 rounded"></div>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={day.value} className="px-2 py-2">
                                    {sessions.map((session, idx) => (
                                      <button
                                        key={session.id}
                                        onClick={() =>
                                          toggleSessionSelection(session)
                                        }
                                        className={`w-full text-left p-2 rounded-lg border transition-all mb-1 ${
                                          isSelected
                                            ? "bg-blue-900 border-blue-500"
                                            : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                                        }`}
                                      >
                                        <div className="flex items-start gap-1">
                                          {isSelected ? (
                                            <CheckSquare className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                          ) : (
                                            <Square className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <p
                                              className={`text-xs font-medium truncate ${
                                                isSelected
                                                  ? "text-blue-200"
                                                  : "text-white"
                                              }`}
                                            >
                                              {session.program_name}
                                            </p>
                                            {session.instructor_name && (
                                              <p className="text-xs text-gray-400 truncate">
                                                {session.instructor_name}
                                              </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {session.current_bookings}/
                                                {session.max_capacity}
                                              </span>
                                              {session.room_location && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                  <MapPin className="h-3 w-3" />
                                                  {session.room_location}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Booking Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date (3 months recommended){" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                {startDate && endDate && selectedSessions.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">
                      This will create{" "}
                      <span className="font-bold text-blue-400">
                        {calculateTotalBookings()}
                      </span>{" "}
                      bookings ({selectedSessions.length} classes per week)
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {!validation.isValid && (
                <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-medium">
                      Form Incomplete
                    </h4>
                    <p className="text-red-400 text-sm">{validation.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">
                Review Your Recurring Bookings
              </h3>

              {/* Summary */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">
                  Selected Classes
                </h4>
                <div className="space-y-2">
                  {selectedSessions.map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {
                            DAYS_OF_WEEK.find(
                              (d) => d.value === session.dayOfWeek,
                            )?.label
                          }
                        </span>
                        <span className="text-white">{session.timeSlot}</span>
                        <span className="text-gray-300">
                          - {session.programName}
                        </span>
                      </div>
                      {session.instructor && (
                        <span className="text-gray-400 text-xs">
                          {session.instructor}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Preview */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  First 10 Bookings Preview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {bookingDates.slice(0, 10).map((booking, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700 rounded px-2 py-1 text-xs"
                    >
                      <p className="text-white font-medium">
                        {booking.date.toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-gray-400">
                        {booking.session.timeSlot}
                      </p>
                    </div>
                  ))}
                </div>
                {bookingDates.length > 10 && (
                  <p className="text-gray-400 text-sm mt-3">
                    ... and {bookingDates.length - 10} more bookings
                  </p>
                )}
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>Note:</strong> This will book you into the selected
                  weekly time slots for the entire period. If class sessions
                  don't exist for future dates, they will be automatically
                  created.
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Recurring Bookings Created!
                </h3>
                <p className="text-green-300">
                  Your recurring bookings have been set up successfully.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  You'll receive confirmations for each booking via email.
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <h4 className="text-white font-medium mb-3">
                  Booking Summary:
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>
                    <strong>Total Bookings Created:</strong>{" "}
                    {totalBookingsCreated}
                  </div>
                  <div>
                    <strong>Classes per Week:</strong> {selectedSessions.length}
                  </div>
                  <div>
                    <strong>Start Date:</strong> {formatBritishDate(startDate)}
                  </div>
                  <div>
                    <strong>End Date:</strong> {formatBritishDate(endDate)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div></div>

          <div className="flex gap-3">
            {step === "select" && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!validation.isValid}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Continue
                </button>
              </>
            )}

            {step === "confirm" && (
              <>
                <button
                  onClick={() => setStep("select")}
                  className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateRecurringBookings}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Recurring Bookings"
                  )}
                </button>
              </>
            )}

            {step === "success" && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
