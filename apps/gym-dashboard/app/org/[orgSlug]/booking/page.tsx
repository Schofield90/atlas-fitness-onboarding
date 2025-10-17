"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Link,
  Settings,
  Video,
  Phone,
  Coffee,
  LayoutGrid,
  CalendarDays,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import toast from "@/app/lib/toast";
import { useRouter, useParams } from "next/navigation";
import { GoogleStyleCalendar } from "@/app/components/calendar/GoogleStyleCalendar";
import { EventDetailsModal } from "@/app/components/calendar/EventDetailsModal";
import { EditEventModal } from "@/app/components/calendar/EditEventModal";
import { BookingModal } from "@/app/components/calendar/BookingModal";
import type { CalendarEvent, TimeSlot } from "@/app/lib/types/calendar";

interface Booking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  booking_status: string;
  meeting_type?: "video" | "phone" | "in_person";
  meeting_link?: string;
  notes?: string;
  duration_minutes?: number;
}

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<
    "calendar" | "upcoming" | "calls" | "past" | "cancelled"
  >("calendar");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    fetchBookings();
    if (activeTab === "calendar") {
      fetchCalendarEvents();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchCalendarEvents();
    }
  }, [selectedDate]);

  const fetchCalendarEvents = async () => {
    try {
      // Get wider date range for calendar view
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 31);

      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const allEvents: CalendarEvent[] = [];

      // Fetch from Google Calendar
      try {
        const googleResponse = await fetch(
          `/api/calendar/google-events?${params}`,
        );
        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          allEvents.push(...(googleData.events || []));
        }
      } catch (error) {
        console.error("Error fetching Google Calendar events:", error);
      }

      // Also fetch from local database
      try {
        const localResponse = await fetch(`/api/calendar/events?${params}`);
        if (localResponse.ok) {
          const localData = await localResponse.json();
          const localEvents = localData.events || [];

          // Add local events that aren't already in Google Calendar
          const googleEventIds = new Set(
            allEvents.map((e) => e.googleEventId).filter(Boolean),
          );
          const uniqueLocalEvents = localEvents.filter(
            (e: CalendarEvent) =>
              !e.googleEventId || !googleEventIds.has(e.googleEventId),
          );

          allEvents.push(...uniqueLocalEvents);
        }
      } catch (error) {
        console.error("Error fetching local events:", error);
      }

      // Sort events by start time
      allEvents.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      setCalendarEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      toast.error("Failed to load calendar events");
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Fetch events from our stable API which already handles auth/org filters
      const params = new URLSearchParams();
      if (activeTab === "upcoming" || activeTab === "calls") {
        params.set("start", new Date().toISOString());
      }
      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        console.error("Error loading events:", payload?.error || payload);
        toast.error("Failed to load bookings. Please try again.");
        setBookings([]);
        return;
      }

      const events = (payload?.events || []) as Array<any>;

      // Transform calendar events to Booking shape expected by UI
      const transformed: Booking[] = events.map((evt) => {
        // Derive meeting type from meetingUrl if possible
        let meetingType: Booking["meeting_type"] | undefined;
        if (evt.meetingUrl) meetingType = "video";

        // Extract primary attendee if available
        const primaryAttendee =
          Array.isArray(evt.attendees) && evt.attendees.length > 0
            ? evt.attendees[0]
            : undefined;
        const attendeeName =
          primaryAttendee?.name || primaryAttendee?.email || "Guest";
        const attendeeEmail = primaryAttendee?.email || "";
        const attendeePhone = primaryAttendee?.phone || undefined;

        return {
          id: evt.id,
          title: evt.title || "Sales Call",
          start_time: evt.startTime,
          end_time: evt.endTime,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_phone: attendeePhone,
          booking_status: evt.status || "confirmed",
          meeting_type: meetingType,
          meeting_link: evt.meetingUrl,
          notes: evt.description || undefined,
          duration_minutes:
            evt.startTime && evt.endTime
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(evt.endTime).getTime() -
                      new Date(evt.startTime).getTime()) /
                      60000,
                  ),
                )
              : undefined,
        };
      });

      // Apply tab filters
      let filtered = transformed;
      const nowIso = new Date().toISOString();
      if (activeTab === "upcoming") {
        filtered = transformed.filter(
          (b) =>
            b.start_time >= nowIso &&
            ["confirmed", "pending"].includes(b.booking_status),
        );
      } else if (activeTab === "calls") {
        filtered = transformed.filter(
          (b) =>
            b.start_time >= nowIso &&
            b.meeting_type === "phone" &&
            ["confirmed", "pending"].includes(b.booking_status),
        );
      } else if (activeTab === "past") {
        filtered = transformed.filter(
          (b) => b.start_time < nowIso && b.booking_status === "completed",
        );
      } else if (activeTab === "cancelled") {
        filtered = transformed.filter((b) => b.booking_status === "cancelled");
      }

      setBookings(filtered);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings. Please try again.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getBookingIcon = (booking: Booking) => {
    if (booking.meeting_type === "video") return <Video className="w-4 h-4" />;
    if (booking.meeting_type === "phone") return <Phone className="w-4 h-4" />;
    return <Coffee className="w-4 h-4" />;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });
  };

  const handleGoogleSlotSelect = (slot: { startTime: Date; endTime: Date }) => {
    const timeSlot: TimeSlot = {
      id: `slot-${slot.startTime.getTime()}`,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      available: true,
    };
    setSelectedSlot(timeSlot);
    setShowBookingModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleSaveEvent = async (updatedEvent: CalendarEvent) => {
    try {
      const response = await fetch("/api/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      await fetchCalendarEvents();
      await fetchBookings();
      toast.success("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event. Please try again.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/events?id=${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      await fetchCalendarEvents();
      await fetchBookings();
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event. Please try again.");
    }
  };

  const handleBookingComplete = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    fetchCalendarEvents();
    fetchBookings();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sales Calls & Consultations</h1>
            <p className="text-gray-400 mt-1">
              Manage your sales calls, consultations, and appointments
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/org/${orgSlug}/settings/booking`)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              onClick={() => {
                try {
                  router.push(`/org/${orgSlug}/booking-links`);
                } catch (err) {
                  console.error((err as Error).message);
                }
              }}
              className="border border-gray-300 text-white hover:bg-gray-700 hover:border-gray-500 px-4 py-2 text-sm flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              Manage Links
            </Button>
            <Button
              onClick={() =>
                router.push(`/org/${orgSlug}/booking-links/create`)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Booking Link
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Today's Calls</p>
                <p className="text-2xl font-bold">
                  {
                    bookings.filter((b) => {
                      const bookingDate = new Date(b.start_time).toDateString();
                      return (
                        bookingDate === new Date().toDateString() &&
                        b.booking_status === "confirmed"
                      );
                    }).length
                  }
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">This Week</p>
                <p className="text-2xl font-bold">
                  {
                    bookings.filter((b) => {
                      const bookingDate = new Date(b.start_time);
                      const weekStart = new Date();
                      weekStart.setDate(
                        weekStart.getDate() - weekStart.getDay(),
                      );
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekEnd.getDate() + 6);
                      return (
                        bookingDate >= weekStart &&
                        bookingDate <= weekEnd &&
                        b.booking_status === "confirmed"
                      );
                    }).length
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Bookings</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Booking Links</p>
                <div className="text-orange-500 text-sm">&nbsp;</div>
              </div>
              <Link className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "calendar"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "upcoming"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab("calls")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "calls"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              Calls
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "past"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              Past
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "cancelled"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              Cancelled
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === "calendar" ? (
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    console.log("Refreshing calendar events...");
                    fetchCalendarEvents();
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors mr-4"
                >
                  Refresh Calendar
                </button>
                <button
                  onClick={() => setCalendarView("week")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    calendarView === "week"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <CalendarDays className="w-4 h-4 inline mr-1" />
                  Week
                </button>
                <button
                  onClick={() => setCalendarView("month")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    calendarView === "month"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 inline mr-1" />
                  Month
                </button>
              </div>
              <div className="text-sm text-gray-400">
                Showing {calendarEvents.length} events
              </div>
            </div>

            {/* Google Calendar Display */}
            <div className="h-[700px] bg-gray-800 rounded-lg">
              <GoogleStyleCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onSlotSelect={handleGoogleSlotSelect}
                onEventClick={handleEventClick}
                events={calendarEvents}
                view={calendarView}
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  {activeTab === "upcoming" && "No upcoming bookings"}
                  {activeTab === "calls" && "No scheduled calls"}
                  {activeTab === "past" && "No past bookings"}
                  {activeTab === "cancelled" && "No cancelled bookings"}
                </p>
                {activeTab === "upcoming" && (
                  <Button
                    onClick={() =>
                      router.push(`/org/${orgSlug}/booking-links/create`)
                    }
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    New Booking Link
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-6 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getBookingIcon(booking)}
                          <h3 className="font-semibold text-white">
                            {booking.title || "Sales Call"}
                          </h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              booking.booking_status === "confirmed"
                                ? "bg-green-900 text-green-300"
                                : booking.booking_status === "pending"
                                  ? "bg-yellow-900 text-yellow-300"
                                  : booking.booking_status === "cancelled"
                                    ? "bg-red-900 text-red-300"
                                    : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {booking.booking_status}
                          </span>
                        </div>

                        <div className="text-sm text-gray-400 space-y-1">
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatDateTime(booking.start_time)} -{" "}
                            {new Date(booking.end_time).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Europe/London",
                              },
                            )}
                            {booking.duration_minutes &&
                              ` (${booking.duration_minutes} min)`}
                          </p>

                          <p className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {booking.attendee_name} • {booking.attendee_email}
                            {booking.attendee_phone &&
                              ` • ${booking.attendee_phone}`}
                          </p>

                          {booking.notes && (
                            <p className="text-gray-500 mt-2">
                              Note: {booking.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {activeTab === "upcoming" && (
                        <div className="flex gap-2 ml-4">
                          {booking.meeting_link && (
                            <a
                              href={booking.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                            >
                              Join Call
                            </a>
                          )}
                          <button
                            onClick={() => {
                              /* Handle reschedule */
                            }}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => {
                              /* Handle cancel */
                            }}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">
            Quick Tips
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>
              • Generate booking URLs in the Calendar → Booking Links section
            </li>
            <li>
              • Set your availability in Settings → Booking → Availability Rules
            </li>
            <li>
              • Appointment types define the duration and details of your calls
            </li>
            <li>
              • Share booking links with prospects to let them self-schedule
            </li>
          </ul>
        </div>

        {/* Modals */}
        {selectedSlot && (
          <BookingModal
            open={showBookingModal}
            onOpenChange={setShowBookingModal}
            slot={selectedSlot}
            duration={30}
            title="Sales Call / Consultation"
            onBookingComplete={handleBookingComplete}
          />
        )}

        <EventDetailsModal
          event={selectedEvent}
          open={showEventDetails}
          onOpenChange={setShowEventDetails}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />

        <EditEventModal
          event={editingEvent}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSave={handleSaveEvent}
        />
      </div>
    </div>
  );
}
