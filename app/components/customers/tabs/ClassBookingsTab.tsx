"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Settings,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarPlus,
  Repeat,
  Package,
  BookOpen,
} from "lucide-react";
import {
  formatBritishDateTime,
  formatBritishDate,
} from "@/app/lib/utils/british-format";
import SingleClassBookingModal from "@/app/components/booking/SingleClassBookingModal";
import MultiClassBookingModal from "@/app/components/booking/MultiClassBookingModal";
import RecurringBookingModal from "@/app/components/booking/RecurringBookingModal";

interface ClassBookingsTabProps {
  customerId: string;
  organizationId: string;
}

interface ClassBooking {
  id: string;
  schedule_id: string;
  client_id: string;
  booking_type: "single" | "recurring" | "package" | "drop_in";
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  payment_status:
    | "pending"
    | "processing"
    | "succeeded"
    | "failed"
    | "refunded"
    | "cancelled";
  payment_amount_pennies: number;
  check_in_time?: string;
  booked_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  special_requirements?: string;
  class_schedule: {
    id: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
    room_location?: string;
    instructor_name?: string;
    class_type: {
      id: string;
      name: string;
      description?: string;
      color?: string;
    };
  };
  recurring_booking?: {
    id: string;
    recurrence_type: string;
    status: string;
  };
}

interface RecurringBooking {
  id: string;
  class_type_id?: string;
  recurrence_type: "weekly" | "biweekly" | "monthly" | "custom";
  recurrence_pattern: any;
  start_date: string;
  end_date?: string;
  status: "active" | "paused" | "cancelled" | "completed";
  current_bookings: number;
  max_bookings?: number;
  class_type?: {
    name: string;
    color?: string;
  };
}

interface ClassPackage {
  id: string;
  package_id: string;
  purchase_date: string;
  expiry_date: string;
  classes_remaining: number;
  classes_used: number;
  status: "active" | "expired" | "refunded" | "transferred";
  package: {
    name: string;
    description?: string;
    class_count: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-600";
    case "cancelled":
      return "bg-red-600";
    case "completed":
      return "bg-blue-600";
    case "no_show":
      return "bg-gray-600";
    default:
      return "bg-gray-600";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed":
      return <CheckCircle className="h-4 w-4" />;
    case "cancelled":
      return <XCircle className="h-4 w-4" />;
    case "completed":
      return <CheckCircle className="h-4 w-4" />;
    case "no_show":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const formatPrice = (pennies: number) => {
  return `£${(pennies / 100).toFixed(2)}`;
};

export default function ClassBookingsTab({
  customerId,
  organizationId,
}: ClassBookingsTabProps) {
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "history" | "recurring" | "packages"
  >("upcoming");
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<
    RecurringBooking[]
  >([]);
  const [classPackages, setClassPackages] = useState<ClassPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Modal states
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [singleClassModal, setSingleClassModal] = useState<{
    isOpen: boolean;
    classSchedule?: any;
  }>({ isOpen: false });
  const [multiClassModal, setMultiClassModal] = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [customerId]);

  // Close booking options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showBookingOptions && !target.closest("[data-booking-options]")) {
        setShowBookingOptions(false);
      }
    };

    if (showBookingOptions) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showBookingOptions]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBookings(),
        fetchRecurringBookings(),
        fetchClassPackages(),
      ]);
    } catch (error) {
      console.error("Error fetching class booking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("class_bookings")
      .select(
        `
        *,
        class_schedule:class_schedules(
          *,
          class_type:class_types(*)
        ),
        recurring_booking:recurring_bookings(*)
      `,
      )
      .eq("client_id", customerId)
      .eq("organization_id", organizationId)
      .order("booked_at", { ascending: false });

    if (error) throw error;
    setBookings(data || []);
  };

  const fetchRecurringBookings = async () => {
    const { data, error } = await supabase
      .from("recurring_bookings")
      .select(
        `
        *,
        class_type:class_types(*)
      `,
      )
      .eq("client_id", customerId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setRecurringBookings(data || []);
  };

  const fetchClassPackages = async () => {
    const { data, error } = await supabase
      .from("customer_class_packages")
      .select(
        `
        *,
        package:class_packages(*)
      `,
      )
      .eq("client_id", customerId)
      .eq("organization_id", organizationId)
      .order("purchase_date", { ascending: false });

    if (error) throw error;
    setClassPackages(data || []);
  };

  const getUpcomingBookings = () => {
    return bookings.filter(
      (booking) =>
        booking.status === "confirmed" &&
        new Date(booking.class_schedule.start_time) > new Date(),
    );
  };

  const getBookingHistory = () => {
    return bookings.filter(
      (booking) =>
        booking.status !== "confirmed" ||
        new Date(booking.class_schedule.start_time) <= new Date(),
    );
  };

  const canCancelBooking = (booking: ClassBooking) => {
    if (booking.status !== "confirmed") return false;

    const classStartTime = new Date(booking.class_schedule.start_time);
    const now = new Date();
    const hoursUntilClass =
      (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilClass > 24; // Default 24-hour cancellation policy
  };

  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from("class_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq("id", bookingId);

      if (error) throw error;
      await fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  const handleQuickBook = async (scheduleId: string) => {
    try {
      const { error } = await supabase.from("class_bookings").insert({
        organization_id: organizationId,
        schedule_id: scheduleId,
        client_id: customerId,
        booking_type: "single",
        status: "confirmed",
        payment_status: "succeeded", // Assuming payment handled elsewhere
        payment_amount_pennies: 0, // Would be calculated from schedule
      });

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error("Error creating booking:", error);
    }
  };

  // Booking modal handlers
  const handleOpenSingleBooking = (classSchedule?: any) => {
    if (classSchedule) {
      // Direct booking for a specific class
      setSingleClassModal({ isOpen: true, classSchedule });
    } else {
      // Open multi-class modal for browsing and single selection
      setMultiClassModal(true);
    }
    setShowBookingOptions(false);
  };

  const handleOpenMultiBooking = () => {
    setMultiClassModal(true);
    setShowBookingOptions(false);
  };

  const handleOpenRecurringBooking = () => {
    setRecurringModal(true);
    setShowBookingOptions(false);
  };

  const handleBookingCreated = () => {
    fetchData(); // Refresh all data
  };

  const TabButton = ({
    tab,
    label,
    icon: Icon,
  }: {
    tab: string;
    label: string;
    icon: any;
  }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === tab
          ? "bg-blue-600 text-white"
          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 ml-3">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">Class Bookings</h3>
        <div className="flex items-center gap-2">
          {/* Book Class Button with Dropdown */}
          <div className="relative" data-booking-options>
            <button
              onClick={() => setShowBookingOptions(!showBookingOptions)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <BookOpen className="h-4 w-4" />
              Book Class
            </button>

            {showBookingOptions && (
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                <div className="py-2">
                  <button
                    onClick={() => handleOpenSingleBooking()}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Single Class</div>
                      <div className="text-xs text-gray-400">
                        Book one specific class
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={handleOpenMultiBooking}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Package className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Multiple Classes</div>
                      <div className="text-xs text-gray-400">
                        Book several classes at once
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={handleOpenRecurringBooking}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <Repeat className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Recurring Booking</div>
                      <div className="text-xs text-gray-400">
                        Set up automatic bookings
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() =>
              setViewMode(viewMode === "list" ? "calendar" : "list")
            }
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {viewMode === "list" ? "Calendar View" : "List View"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        <TabButton tab="upcoming" label="Upcoming" icon={Calendar} />
        <TabButton tab="history" label="History" icon={History} />
        <TabButton tab="recurring" label="Recurring" icon={Repeat} />
        <TabButton tab="packages" label="Packages" icon={Package} />
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeTab === "upcoming" && (
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <div>
              <h4 className="text-lg font-medium text-white mb-4">
                Upcoming Sessions
              </h4>
              {getUpcomingBookings().length === 0 ? (
                <div className="bg-gray-700 rounded-lg p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">
                    No upcoming sessions booked
                  </p>
                  <p className="text-gray-400 text-sm">
                    Use the "Book Class" button above to book this client into
                    classes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getUpcomingBookings()
                    .slice(0, 6)
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-medium text-white">
                            {booking.class_schedule.class_type?.name ||
                              "Untitled Class"}
                          </h5>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(booking.status)}
                            <span
                              className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(booking.status)}`}
                            >
                              {booking.status}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {
                              formatBritishDateTime(
                                booking.class_schedule.start_time,
                              ).split(" ")[1]
                            }{" "}
                            -{" "}
                            {
                              formatBritishDateTime(
                                booking.class_schedule.end_time,
                              ).split(" ")[1]
                            }
                          </div>
                          {booking.class_schedule.room_location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {booking.class_schedule.room_location}
                            </div>
                          )}
                          {booking.booking_type === "recurring" && (
                            <div className="flex items-center gap-2">
                              <Repeat className="h-4 w-4" />
                              <span className="text-xs">Recurring</span>
                            </div>
                          )}
                        </div>
                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <h4 className="text-lg font-medium text-white mb-4">
              Booking History
            </h4>
            {getBookingHistory().length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No booking history</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getBookingHistory().map((booking) => (
                  <div key={booking.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-white">
                            {booking.class_schedule.class_type?.name ||
                              "Untitled Class"}
                          </h5>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(booking.status)}
                            <span
                              className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(booking.status)}`}
                            >
                              {booking.status}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatBritishDateTime(
                              booking.class_schedule.start_time,
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Booked: {formatBritishDateTime(booking.booked_at)}
                          </div>
                        </div>
                        {booking.cancellation_reason && (
                          <p className="text-sm text-red-300 mt-2">
                            <strong>Cancelled:</strong>{" "}
                            {booking.cancellation_reason}
                          </p>
                        )}
                        {booking.check_in_time && (
                          <p className="text-sm text-green-300 mt-2">
                            <strong>Checked In:</strong>{" "}
                            {formatBritishDateTime(booking.check_in_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "recurring" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-white">
                Recurring Bookings
              </h4>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                <CalendarPlus className="h-4 w-4" />
                Add Recurring
              </button>
            </div>
            {recurringBookings.length === 0 ? (
              <div className="text-center py-8">
                <Repeat className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No recurring bookings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringBookings.map((recurring) => (
                  <div
                    key={recurring.id}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-white">
                            {recurring.class_type?.name || "All Classes"}
                          </h5>
                          <span
                            className={`px-2 py-1 text-xs text-white rounded ${
                              recurring.status === "active"
                                ? "bg-green-600"
                                : recurring.status === "paused"
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                            }`}
                          >
                            {recurring.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                          <div>
                            <strong>Frequency:</strong>{" "}
                            {recurring.recurrence_type}
                          </div>
                          <div>
                            <strong>Classes Used:</strong>{" "}
                            {recurring.current_bookings}
                            {recurring.max_bookings
                              ? ` / ${recurring.max_bookings}`
                              : ""}
                          </div>
                          <div>
                            <strong>Started:</strong>{" "}
                            {formatBritishDate(recurring.start_date)}
                          </div>
                        </div>
                        {recurring.end_date && (
                          <p className="text-sm text-gray-400 mt-2">
                            <strong>Ends:</strong>{" "}
                            {formatBritishDate(recurring.end_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          <Settings className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "packages" && (
          <div>
            <h4 className="text-lg font-medium text-white mb-4">
              Class Packages
            </h4>
            {classPackages.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No class packages purchased</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-white">
                            {pkg.package?.name || "Class Package"}
                          </h5>
                          <span
                            className={`px-2 py-1 text-xs text-white rounded ${
                              pkg.status === "active"
                                ? "bg-green-600"
                                : pkg.status === "expired"
                                  ? "bg-red-600"
                                  : "bg-gray-600"
                            }`}
                          >
                            {pkg.status}
                          </span>
                        </div>
                        {pkg.package?.description && (
                          <p className="text-sm text-gray-300 mb-3">
                            {pkg.package.description}
                          </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                          <div>
                            <strong>Classes Remaining:</strong>{" "}
                            {pkg.classes_remaining} /{" "}
                            {pkg.package?.class_count || 0}
                          </div>
                          <div>
                            <strong>Purchased:</strong>{" "}
                            {formatBritishDate(pkg.purchase_date)}
                          </div>
                          <div>
                            <strong>Expires:</strong>{" "}
                            {formatBritishDate(pkg.expiry_date)}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(pkg.classes_used / (pkg.package?.class_count || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modals */}
      {singleClassModal.isOpen && singleClassModal.classSchedule && (
        <SingleClassBookingModal
          isOpen={singleClassModal.isOpen}
          onClose={() => setSingleClassModal({ isOpen: false })}
          classSchedule={singleClassModal.classSchedule}
          customerId={customerId}
          organizationId={organizationId}
          onBookingCreated={handleBookingCreated}
        />
      )}

      <MultiClassBookingModal
        isOpen={multiClassModal}
        onClose={() => setMultiClassModal(false)}
        customerId={customerId}
        organizationId={organizationId}
        onBookingsCreated={handleBookingCreated}
      />

      <RecurringBookingModal
        isOpen={recurringModal}
        onClose={() => setRecurringModal(false)}
        customerId={customerId}
        organizationId={organizationId}
        onRecurringBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
