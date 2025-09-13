"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Calendar,
  Clock,
  Users,
  Dumbbell,
  Coffee,
  Wrench,
  Sparkles,
  UserCheck,
  Building,
  GraduationCap,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Check,
  Edit2,
  Trash2,
  User,
  MapPin,
  Info,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isSameDay, isWithinInterval, differenceInMinutes } from "date-fns";

// Types
interface StaffCalendarBooking {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  booking_type: BookingType;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  all_day: boolean;
  staff_id?: string;
  staff_name?: string;
  location?: string;
  room_area?: string;
  max_capacity?: number;
  current_bookings: number;
  color_hex?: string;
  class_session_id?: string;
  metadata?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  display_color?: string;
  staff_email?: string;
  staff_full_name?: string;
  confirmed_client_count?: number;
}

type BookingType = 
  | "pt_session_121"
  | "group_class"
  | "gym_floor_time"
  | "staff_meeting"
  | "consultation"
  | "equipment_maintenance"
  | "facility_cleaning"
  | "private_event"
  | "break_time"
  | "training_session";

type BookingStatus = "confirmed" | "tentative" | "cancelled" | "completed" | "no_show";

type CalendarView = "day" | "week" | "month";

interface SharedStaffCalendarProps {
  organizationId: string;
  currentUserId: string;
  initialView?: CalendarView;
  onBookingClick?: (booking: StaffCalendarBooking) => void;
  allowEditing?: boolean;
}

// Booking type configuration
const BOOKING_TYPE_CONFIG: Record<BookingType, { label: string; icon: React.ElementType; color: string }> = {
  pt_session_121: { label: "1-2-1 PT Session", icon: Dumbbell, color: "#3B82F6" },
  group_class: { label: "Group Class", icon: Users, color: "#10B981" },
  gym_floor_time: { label: "Gym Floor Time", icon: Building, color: "#F59E0B" },
  staff_meeting: { label: "Staff Meeting", icon: Users, color: "#EF4444" },
  consultation: { label: "Consultation", icon: UserCheck, color: "#8B5CF6" },
  equipment_maintenance: { label: "Maintenance", icon: Wrench, color: "#6B7280" },
  facility_cleaning: { label: "Cleaning", icon: Sparkles, color: "#06B6D4" },
  private_event: { label: "Private Event", icon: Calendar, color: "#EC4899" },
  break_time: { label: "Break", icon: Coffee, color: "#84CC16" },
  training_session: { label: "Training", icon: GraduationCap, color: "#F97316" },
};

// Time slots from 6 AM to 9 PM in 30-minute increments
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return {
    value: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    label: format(new Date(2024, 0, 1, hour, minute), "h:mm a"),
  };
});

export default function SharedStaffCalendar({
  organizationId,
  currentUserId,
  initialView = "week",
  onBookingClick,
  allowEditing = true,
}: SharedStaffCalendarProps) {
  const supabase = createClient();

  // State
  const [view, setView] = useState<CalendarView>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<StaffCalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<StaffCalendarBooking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    staffId: "",
    bookingType: "" as BookingType | "",
  });
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [newBookingSlot, setNewBookingSlot] = useState<{ date: Date; time: string } | null>(null);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case "day":
        return {
          start: currentDate,
          end: currentDate,
        };
      case "week":
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case "month":
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [view, currentDate]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to use the view first, fallback to class_sessions if it doesn't exist
      let query = supabase
        .from("staff_calendar_bookings_view")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("start_time", dateRange.start.toISOString())
        .lte("start_time", dateRange.end.toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      // First attempt with the view
      let { data, error } = await query;

      // If the view doesn't exist, fallback to class_sessions
      if (error?.code === "42P01") {
        console.log("View not found, falling back to class_sessions");
        
        const { data: sessions, error: sessionError } = await supabase
          .from("class_sessions")
          .select(`
            *,
            program:programs(name, description, price_pennies)
          `)
          .eq("organization_id", organizationId)
          .gte("start_time", dateRange.start.toISOString())
          .lte("start_time", dateRange.end.toISOString())
          .order("start_time", { ascending: true });

        if (!sessionError && sessions) {
          // Transform class_sessions to match calendar booking format
          data = sessions.map((session) => ({
            id: session.id,
            organization_id: session.organization_id,
            title: session.program?.name || "Class Session",
            description: session.program?.description,
            booking_type: "group_class" as BookingType,
            status: "confirmed" as BookingStatus,
            start_time: session.start_time,
            end_time: new Date(new Date(session.start_time).getTime() + (session.duration_minutes || 60) * 60000).toISOString(),
            all_day: false,
            staff_id: session.instructor_id,
            staff_name: session.instructor_name,
            location: session.location,
            room_area: session.location,
            max_capacity: session.capacity || session.max_capacity,
            current_bookings: session.current_bookings || 0,
            color_hex: "#10B981",
            class_session_id: session.id,
            metadata: { synced_from_class: true },
            notes: null,
            created_at: session.created_at,
            updated_at: session.updated_at,
            display_color: "#10B981",
            staff_email: null,
            staff_full_name: session.instructor_name,
            confirmed_client_count: session.current_bookings || 0,
          }));
          error = null;
        } else {
          error = sessionError;
        }
      }

      query = supabase
        .from("staff_calendar_bookings_view")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("start_time", dateRange.start.toISOString())
        .lte("start_time", dateRange.end.toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (filters.staffId) {
        query = query.eq("staff_id", filters.staffId);
      }
      if (filters.bookingType) {
        query = query.eq("booking_type", filters.bookingType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load calendar bookings");
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateRange, filters, supabase]);

  // Fetch staff members
  const fetchStaffMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("user_id, first_name, last_name")
        .eq("organization_id", organizationId);

      if (error) throw error;

      setStaffMembers(
        (data || []).map((staff) => ({
          id: staff.user_id,
          name: `${staff.first_name} ${staff.last_name}`.trim() || "Unknown Staff",
        }))
      );
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  }, [organizationId, supabase]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`calendar-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_calendar_bookings",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchBookings, supabase]);

  // Initial data fetch
  useEffect(() => {
    fetchBookings();
    fetchStaffMembers();
  }, [fetchBookings, fetchStaffMembers]);

  // Navigation handlers
  const navigatePrevious = () => {
    switch (view) {
      case "day":
        setCurrentDate((prev) => addDays(prev, -1));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, -1));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case "day":
        setCurrentDate((prev) => addDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Create/Update booking
  const handleSaveBooking = async (bookingData: Partial<StaffCalendarBooking>) => {
    try {
      setError(null);

      // Check for conflicts
      const { data: conflicts } = await supabase.rpc("check_staff_calendar_conflicts", {
        p_staff_id: bookingData.staff_id || currentUserId,
        p_start_time: bookingData.start_time,
        p_end_time: bookingData.end_time,
        p_exclude_booking_id: bookingData.id || null,
      });

      if (conflicts && conflicts.length > 0) {
        const confirmOverride = confirm(
          `This time slot conflicts with "${conflicts[0].title}". Do you want to continue anyway?`
        );
        if (!confirmOverride) return;
      }

      if (bookingData.id) {
        // Update existing
        const { error } = await supabase
          .from("staff_calendar_bookings")
          .update({
            ...bookingData,
            updated_at: new Date().toISOString(),
            updated_by: currentUserId,
          })
          .eq("id", bookingData.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("staff_calendar_bookings").insert({
          ...bookingData,
          organization_id: organizationId,
          created_by: currentUserId,
        });

        if (error) throw error;
      }

      setShowBookingModal(false);
      setSelectedBooking(null);
      setNewBookingSlot(null);
      fetchBookings();
    } catch (err) {
      console.error("Error saving booking:", err);
      setError("Failed to save booking");
    }
  };

  // Delete booking
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    try {
      const { error } = await supabase
        .from("staff_calendar_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      setShowBookingModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      console.error("Error deleting booking:", err);
      setError("Failed to delete booking");
    }
  };

  // Render booking in calendar
  const renderBooking = (booking: StaffCalendarBooking) => {
    const Icon = BOOKING_TYPE_CONFIG[booking.booking_type].icon;
    const isGroupClass = booking.booking_type === "group_class";
    const capacityPercentage = booking.max_capacity
      ? (booking.current_bookings / booking.max_capacity) * 100
      : 0;

    return (
      <div
        key={booking.id}
        className="group relative p-2 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
        style={{
          backgroundColor: booking.display_color || booking.color_hex || BOOKING_TYPE_CONFIG[booking.booking_type].color,
        }}
        onClick={() => {
          setSelectedBooking(booking);
          setShowBookingModal(true);
          onBookingClick?.(booking);
        }}
      >
        {/* Capacity indicator for group classes */}
        {isGroupClass && booking.max_capacity && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all"
            style={{ width: `${capacityPercentage}%` }}
          />
        )}

        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-white/90 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{booking.title}</p>
            {booking.staff_full_name && (
              <p className="text-xs text-white/80 truncate">{booking.staff_full_name}</p>
            )}
            {booking.location && (
              <p className="text-xs text-white/70 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {booking.location}
              </p>
            )}
            {isGroupClass && booking.max_capacity && (
              <p className="text-xs text-white/90 font-medium mt-1">
                {booking.current_bookings}/{booking.max_capacity}
              </p>
            )}
          </div>
        </div>

        {/* Edit/Delete buttons on hover */}
        {allowEditing && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBooking(booking);
                setShowBookingModal(true);
              }}
            >
              <Edit2 className="w-3 h-3 text-white" />
            </button>
            <button
              className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBooking(booking.id);
              }}
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    switch (view) {
      case "day":
        return <DayView date={currentDate} bookings={bookings} renderBooking={renderBooking} onSlotClick={handleSlotClick} />;
      case "week":
        return <WeekView startDate={dateRange.start} bookings={bookings} renderBooking={renderBooking} onSlotClick={handleSlotClick} />;
      case "month":
        return <MonthView startDate={dateRange.start} bookings={bookings} renderBooking={renderBooking} onSlotClick={handleSlotClick} />;
    }
  };

  const handleSlotClick = (date: Date, time: string) => {
    if (!allowEditing) return;
    setNewBookingSlot({ date, time });
    setSelectedBooking(null);
    setShowBookingModal(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Staff Calendar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={navigateToday}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Today
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              <span className="text-white font-medium ml-2">
                {format(currentDate, view === "day" ? "EEEE, MMMM d, yyyy" : view === "week" ? "'Week of' MMM d, yyyy" : "MMMM yyyy")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggles */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              {(["day", "week", "month"] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === v ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Add booking button */}
            {allowEditing && (
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setNewBookingSlot(null);
                  setShowBookingModal(true);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Booking</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg flex flex-wrap gap-4">
            <select
              value={filters.staffId}
              onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
            >
              <option value="">All Staff</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>

            <select
              value={filters.bookingType}
              onChange={(e) => setFilters({ ...filters, bookingType: e.target.value as BookingType | "" })}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
            >
              <option value="">All Types</option>
              {Object.entries(BOOKING_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFilters({ staffId: "", bookingType: "" })}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-white">{error}</p>
              <button
                onClick={fetchBookings}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          renderCalendarGrid()
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          booking={selectedBooking}
          newSlot={newBookingSlot}
          staffMembers={staffMembers}
          currentUserId={currentUserId}
          onSave={handleSaveBooking}
          onDelete={handleDeleteBooking}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedBooking(null);
            setNewBookingSlot(null);
          }}
        />
      )}
    </div>
  );
}

// Day View Component
function DayView({
  date,
  bookings,
  renderBooking,
  onSlotClick,
}: {
  date: Date;
  bookings: StaffCalendarBooking[];
  renderBooking: (booking: StaffCalendarBooking) => React.ReactNode;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const dayBookings = bookings.filter((b) => isSameDay(new Date(b.start_time), date));

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[100px_1fr] divide-x divide-gray-700">
        {/* Time column */}
        <div className="divide-y divide-gray-700">
          {TIME_SLOTS.map((slot) => (
            <div key={slot.value} className="h-16 px-2 py-1 text-xs text-gray-400 text-right">
              {slot.label}
            </div>
          ))}
        </div>

        {/* Bookings column */}
        <div className="divide-y divide-gray-700 relative">
          {TIME_SLOTS.map((slot) => {
            const slotBookings = dayBookings.filter((b) => {
              const bookingStart = format(new Date(b.start_time), "HH:mm");
              return bookingStart === slot.value;
            });

            return (
              <div
                key={slot.value}
                className="h-16 p-1 hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => onSlotClick(date, slot.value)}
              >
                <div className="flex gap-1 flex-wrap">
                  {slotBookings.map((booking) => renderBooking(booking))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  startDate,
  bookings,
  renderBooking,
  onSlotClick,
}: {
  startDate: Date;
  bookings: StaffCalendarBooking[];
  renderBooking: (booking: StaffCalendarBooking) => React.ReactNode;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[100px_repeat(7,1fr)] divide-x divide-gray-700">
        {/* Header */}
        <div className="h-12 bg-gray-700"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="h-12 bg-gray-700 p-2 text-center">
            <div className="text-xs text-gray-400">{format(day, "EEE")}</div>
            <div className="text-sm font-medium text-white">{format(day, "d")}</div>
          </div>
        ))}

        {/* Time slots */}
        {TIME_SLOTS.map((slot) => (
          <React.Fragment key={slot.value}>
            <div className="h-16 px-2 py-1 text-xs text-gray-400 text-right border-t border-gray-700">
              {slot.label}
            </div>
            {weekDays.map((day) => {
              const slotBookings = bookings.filter((b) => {
                const bookingDate = new Date(b.start_time);
                const bookingTime = format(bookingDate, "HH:mm");
                return isSameDay(bookingDate, day) && bookingTime === slot.value;
              });

              return (
                <div
                  key={`${day.toISOString()}-${slot.value}`}
                  className="h-16 p-1 border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => onSlotClick(day, slot.value)}
                >
                  <div className="flex flex-col gap-1">
                    {slotBookings.slice(0, 2).map((booking) => renderBooking(booking))}
                    {slotBookings.length > 2 && (
                      <div className="text-xs text-gray-400 text-center">
                        +{slotBookings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  startDate,
  bookings,
  renderBooking,
  onSlotClick,
}: {
  startDate: Date;
  bookings: StaffCalendarBooking[];
  renderBooking: (booking: StaffCalendarBooking) => React.ReactNode;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const endDate = endOfMonth(startDate);
  const startWeek = startOfWeek(startDate, { weekStartsOn: 1 });
  const endWeek = endOfWeek(endDate, { weekStartsOn: 1 });
  const totalDays = Math.ceil((endWeek.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const weeks = Math.ceil(totalDays / 7);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-700">
        {/* Header */}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="h-10 bg-gray-700 p-2 text-center text-sm font-medium text-white">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const day = addDays(startWeek, i);
          const isCurrentMonth = day >= startDate && day <= endDate;
          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.start_time), day));

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] p-2 border-t border-gray-700 ${
                isCurrentMonth ? "bg-gray-800" : "bg-gray-900/50"
              } hover:bg-gray-700/50 cursor-pointer transition-colors`}
              onClick={() => onSlotClick(day, "09:00")}
            >
              <div className={`text-sm mb-1 ${isCurrentMonth ? "text-white" : "text-gray-600"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="text-xs p-1 rounded truncate"
                    style={{
                      backgroundColor: booking.display_color || BOOKING_TYPE_CONFIG[booking.booking_type].color,
                      color: "white",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {format(new Date(booking.start_time), "HH:mm")} {booking.title}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-400">+{dayBookings.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Booking Modal Component
function BookingModal({
  booking,
  newSlot,
  staffMembers,
  currentUserId,
  onSave,
  onDelete,
  onClose,
}: {
  booking: StaffCalendarBooking | null;
  newSlot: { date: Date; time: string } | null;
  staffMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  onSave: (booking: Partial<StaffCalendarBooking>) => void;
  onDelete: (bookingId: string) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<StaffCalendarBooking>>(() => {
    if (booking) {
      return { ...booking };
    }
    if (newSlot) {
      const [hours, minutes] = newSlot.time.split(":").map(Number);
      const startTime = new Date(newSlot.date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(hours + 1, minutes, 0, 0);

      return {
        title: "",
        description: "",
        booking_type: "gym_floor_time",
        status: "confirmed",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        staff_id: currentUserId,
        location: "",
        notes: "",
      };
    }
    return {
      title: "",
      description: "",
      booking_type: "gym_floor_time",
      status: "confirmed",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      staff_id: currentUserId,
      location: "",
      notes: "",
    };
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {booking ? "Edit Booking" : "New Booking"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              placeholder="e.g., PT Session with John"
            />
          </div>

          {/* Booking Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
            <select
              value={formData.booking_type || "gym_floor_time"}
              onChange={(e) => setFormData({ ...formData, booking_type: e.target.value as BookingType })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              disabled={booking?.class_session_id ? true : false}
            >
              {Object.entries(BOOKING_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.label}
                </option>
              ))}
            </select>
            {booking?.class_session_id && (
              <p className="text-xs text-gray-500 mt-1">Auto-synced from class schedule</p>
            )}
          </div>

          {/* Staff Member */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Staff Member</label>
            <select
              value={formData.staff_id || currentUserId}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
            >
              <option value={currentUserId}>Me</option>
              {staffMembers
                .filter((s) => s.id !== currentUserId)
                .map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.start_time ? format(new Date(formData.start_time), "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setFormData({ ...formData, start_time: new Date(e.target.value).toISOString() })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.end_time ? format(new Date(formData.end_time), "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => setFormData({ ...formData, end_time: new Date(e.target.value).toISOString() })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Location</label>
            <input
              type="text"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              placeholder="e.g., Main Floor, Studio 1, PT Area"
            />
          </div>

          {/* Capacity (for certain types) */}
          {["group_class", "training_session", "private_event"].includes(formData.booking_type || "") && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Capacity</label>
              <input
                type="number"
                value={formData.max_capacity || ""}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
                placeholder="Maximum number of participants"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              rows={3}
              placeholder="Additional details..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Internal Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-orange-500"
              rows={2}
              placeholder="Staff-only notes..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-between">
          <div>
            {booking && !booking.class_session_id && (
              <button
                onClick={() => onDelete(booking.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}