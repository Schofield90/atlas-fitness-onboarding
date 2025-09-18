"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Calendar,
  Download,
  Filter,
  BarChart3,
  Users,
  MapPin,
  Clock,
  CreditCard,
  ExternalLink,
  ChevronDown,
  Search,
  X,
  RefreshCw,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceResponse,
  AttendanceGroupedData,
  ChartDataResponse,
  DatePreset,
  FilterOption,
  CustomerOption,
  ClassTypeOption,
  VenueOption,
  InstructorOption,
  MembershipOption,
} from "@/app/types/attendances";

// Date presets
const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return { from: today, to: tomorrow };
    },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(yesterday.getDate() + 1);
      return { from: yesterday, to: today };
    },
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { from: start, to: end };
    },
  },
  {
    label: "This Week",
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { from: start, to: end };
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: start, to: end };
    },
  },
  {
    label: "Last Month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: end };
    },
  },
  {
    label: "This Year",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear() + 1, 0, 1);
      return { from: start, to: end };
    },
  },
];

const GROUP_BY_OPTIONS = [
  { value: "each", label: "Individual Attendances" },
  { value: "customer", label: "By Customer" },
  { value: "class_type", label: "By Class Type" },
  { value: "venue", label: "By Venue" },
  { value: "instructor", label: "By Instructor" },
  { value: "day_of_week", label: "By Day of Week" },
  { value: "start_time", label: "By Start Time" },
  { value: "booking_method", label: "By Booking Method" },
  { value: "status", label: "By Status" },
  { value: "booking_source", label: "By Booking Source" },
];

const BOOKING_METHOD_OPTIONS = [
  { value: "membership", label: "Membership" },
  { value: "drop_in", label: "Drop-in" },
  { value: "free", label: "Free" },
  { value: "package", label: "Package" },
];

const BOOKING_SOURCE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "kiosk", label: "Kiosk" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "staff", label: "Staff" },
  { value: "api", label: "API" },
];

const STATUS_OPTIONS = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "late_cancelled", label: "Late Cancelled" },
  { value: "no_show", label: "No Show" },
];

interface FilterState {
  dateFrom: string;
  dateTo: string;
  customerId?: string;
  classTypeId?: string;
  venueId?: string;
  instructorId?: string;
  bookingMethods: string[];
  bookingSources: string[];
  membershipId?: string;
  statuses: string[];
  includeFuture: boolean;
  groupBy: string;
  page: number;
  pageSize: number;
  showChart: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AttendancesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    const defaultDateRange = DATE_PRESETS[2].getValue(); // Last 30 days
    return {
      dateFrom:
        searchParams?.get("date_from") || defaultDateRange.from.toISOString(),
      dateTo: searchParams?.get("date_to") || defaultDateRange.to.toISOString(),
      customerId: searchParams?.get("customer_id") || undefined,
      classTypeId: searchParams?.get("class_type_id") || undefined,
      venueId: searchParams?.get("venue_id") || undefined,
      instructorId: searchParams?.get("instructor_id") || undefined,
      bookingMethods: searchParams?.getAll("booking_method") || [],
      bookingSources: searchParams?.getAll("booking_source") || [],
      membershipId: searchParams?.get("membership_id") || undefined,
      statuses: searchParams?.getAll("status") || [],
      includeFuture: searchParams?.get("include_future") === "true",
      groupBy: searchParams?.get("group_by") || "each",
      page: parseInt(searchParams?.get("page") || "1"),
      pageSize: parseInt(searchParams?.get("page_size") || "50"),
      showChart: false,
    };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    params.set("date_from", filters.dateFrom);
    params.set("date_to", filters.dateTo);
    params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);

    if (filters.customerId) params.set("customer_id", filters.customerId);
    if (filters.classTypeId) params.set("class_type_id", filters.classTypeId);
    if (filters.venueId) params.set("venue_id", filters.venueId);
    if (filters.instructorId) params.set("instructor_id", filters.instructorId);
    if (filters.membershipId) params.set("membership_id", filters.membershipId);

    filters.bookingMethods.forEach((method) =>
      params.append("booking_method", method),
    );
    filters.bookingSources.forEach((source) =>
      params.append("booking_source", source),
    );
    filters.statuses.forEach((status) => params.append("status", status));

    params.set("include_future", filters.includeFuture.toString());
    params.set("group_by", filters.groupBy);
    params.set("page", filters.page.toString());
    params.set("page_size", filters.pageSize.toString());

    return `/api/reports/attendances?${params.toString()}`;
  }, [filters]);

  // Fetch attendance data
  const {
    data: attendanceData,
    error: attendanceError,
    isLoading,
    mutate,
  } = useSWR<AttendanceResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
    revalidateOnFocus: false,
  });

  // Fetch chart data when chart is shown
  const chartUrl = useMemo(() => {
    if (!filters.showChart) return null;

    const params = new URLSearchParams();
    params.set("type", "daily");
    params.set("date_from", filters.dateFrom);
    params.set("date_to", filters.dateTo);
    params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);

    if (filters.customerId) params.set("customer_id", filters.customerId);
    if (filters.classTypeId) params.set("class_type_id", filters.classTypeId);
    if (filters.venueId) params.set("venue_id", filters.venueId);
    if (filters.instructorId) params.set("instructor_id", filters.instructorId);
    if (filters.membershipId) params.set("membership_id", filters.membershipId);

    filters.bookingMethods.forEach((method) =>
      params.append("booking_method", method),
    );
    filters.bookingSources.forEach((source) =>
      params.append("booking_source", source),
    );
    filters.statuses.forEach((status) => params.append("status", status));

    params.set("include_future", filters.includeFuture.toString());

    return `/api/reports/attendances/chart?${params.toString()}`;
  }, [filters, filters.showChart]);

  const { data: chartData } = useSWR<ChartDataResponse>(chartUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // Handle filter changes
  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  // Handle date preset selection
  const handleDatePreset = (preset: DatePreset) => {
    const { from, to } = preset.getValue();
    updateFilters({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
    setCustomDateRange(false);
  };

  // Handle CSV export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date_from", filters.dateFrom);
      params.set("date_to", filters.dateTo);
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);

      if (filters.customerId) params.set("customer_id", filters.customerId);
      if (filters.classTypeId) params.set("class_type_id", filters.classTypeId);
      if (filters.venueId) params.set("venue_id", filters.venueId);
      if (filters.instructorId)
        params.set("instructor_id", filters.instructorId);
      if (filters.membershipId)
        params.set("membership_id", filters.membershipId);

      filters.bookingMethods.forEach((method) =>
        params.append("booking_method", method),
      );
      filters.bookingSources.forEach((source) =>
        params.append("booking_source", source),
      );
      filters.statuses.forEach((status) => params.append("status", status));

      params.set("include_future", filters.includeFuture.toString());

      const response = await fetch(
        `/api/reports/attendances/export?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendances-report-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      // You could add a toast notification here
    } finally {
      setExportLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!attendanceData?.data) return null;

    if (filters.groupBy === "each" && attendanceData.data.attendances) {
      const records = attendanceData.data.attendances;
      return {
        totalBookings: records.length,
        attendedCount: records.filter((r) => r.attendance_status === "attended")
          .length,
        noShowCount: records.filter((r) => r.attendance_status === "no_show")
          .length,
        cancelledCount: records.filter(
          (r) => r.attendance_status === "late_cancelled",
        ).length,
        attendanceRate:
          records.length > 0
            ? Math.round(
                (records.filter((r) => r.attendance_status === "attended")
                  .length /
                  records.length) *
                  100,
              )
            : 0,
      };
    } else if (attendanceData.data.grouped_data) {
      const groups = attendanceData.data.grouped_data;
      const totals = groups.reduce(
        (acc, group) => ({
          totalBookings: acc.totalBookings + group.total_bookings,
          attendedCount: acc.attendedCount + group.attended_count,
          noShowCount: acc.noShowCount + group.no_show_count,
          cancelledCount: acc.cancelledCount + group.cancelled_count,
        }),
        {
          totalBookings: 0,
          attendedCount: 0,
          noShowCount: 0,
          cancelledCount: 0,
        },
      );

      return {
        ...totals,
        attendanceRate:
          totals.totalBookings > 0
            ? Math.round((totals.attendedCount / totals.totalBookings) * 100)
            : 0,
      };
    }

    return null;
  }, [attendanceData, filters.groupBy]);

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  All Attendances
                </h1>
                <p className="text-gray-400">
                  Comprehensive attendance tracking across all classes and time
                  periods
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      showChart: !prev.showChart,
                    }))
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    filters.showChart
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </button>

                <button
                  onClick={handleExport}
                  disabled={exportLoading || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {exportLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            className={`bg-gray-800 rounded-lg border border-gray-700 mb-6 transition-all duration-200 ${
              showFilters ? "p-6" : "p-4"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-white hover:text-orange-400 transition-colors"
              >
                <Filter className="h-5 w-5" />
                <span className="font-medium">Filters</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showFilters && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={filters.includeFuture}
                      onChange={(e) =>
                        updateFilters({ includeFuture: e.target.checked })
                      }
                      className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-600"
                    />
                    Include future classes
                  </label>
                </div>
              )}
            </div>

            {showFilters && (
              <div className="space-y-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Range
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleDatePreset(preset)}
                        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomDateRange(!customDateRange)}
                      className={`px-3 py-1 text-sm rounded border transition-colors ${
                        customDateRange
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {customDateRange && (
                    <div className="flex gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          From
                        </label>
                        <input
                          type="date"
                          value={filters.dateFrom.split("T")[0]}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            date.setHours(0, 0, 0, 0);
                            updateFilters({ dateFrom: date.toISOString() });
                          }}
                          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          To
                        </label>
                        <input
                          type="date"
                          value={filters.dateTo.split("T")[0]}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            date.setHours(23, 59, 59, 999);
                            updateFilters({ dateTo: date.toISOString() });
                          }}
                          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Group By */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group By
                  </label>
                  <select
                    value={filters.groupBy}
                    onChange={(e) => updateFilters({ groupBy: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full md:w-auto"
                  >
                    {GROUP_BY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-select filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Booking Methods */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Booking Methods
                    </label>
                    <div className="space-y-1">
                      {BOOKING_METHOD_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={filters.bookingMethods.includes(
                              option.value,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateFilters({
                                  bookingMethods: [
                                    ...filters.bookingMethods,
                                    option.value,
                                  ],
                                });
                              } else {
                                updateFilters({
                                  bookingMethods: filters.bookingMethods.filter(
                                    (m) => m !== option.value,
                                  ),
                                });
                              }
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-600"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Booking Sources */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Booking Sources
                    </label>
                    <div className="space-y-1">
                      {BOOKING_SOURCE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={filters.bookingSources.includes(
                              option.value,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateFilters({
                                  bookingSources: [
                                    ...filters.bookingSources,
                                    option.value,
                                  ],
                                });
                              } else {
                                updateFilters({
                                  bookingSources: filters.bookingSources.filter(
                                    (s) => s !== option.value,
                                  ),
                                });
                              }
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-600"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Statuses */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="space-y-1">
                      {STATUS_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateFilters({
                                  statuses: [...filters.statuses, option.value],
                                });
                              } else {
                                updateFilters({
                                  statuses: filters.statuses.filter(
                                    (s) => s !== option.value,
                                  ),
                                });
                              }
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-600"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Bookings</p>
                    <p className="text-2xl font-bold text-white">
                      {summaryStats.totalBookings.toLocaleString()}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Attended</p>
                    <p className="text-2xl font-bold text-green-500">
                      {summaryStats.attendedCount.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">No Shows</p>
                    <p className="text-2xl font-bold text-red-500">
                      {summaryStats.noShowCount.toLocaleString()}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Cancelled</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {summaryStats.cancelledCount.toLocaleString()}
                    </p>
                  </div>
                  <X className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Attendance Rate</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {summaryStats.attendanceRate}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          {filters.showChart && chartData?.data && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Daily Attendance Trend
              </h3>
              {chartData.data.chart_data.length > 0 ? (
                <div className="h-64 flex items-end justify-between gap-2">
                  {chartData.data.chart_data.map((point, index) => {
                    const maxValue = Math.max(
                      ...chartData.data.chart_data.map((p) => p.value),
                    );
                    const height =
                      maxValue > 0 ? (point.value / maxValue) * 100 : 0;

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div className="text-xs text-gray-400 mb-1">
                          {point.value}
                        </div>
                        <div
                          className="w-full bg-orange-600 rounded-t transition-all hover:bg-orange-500"
                          style={{
                            height: `${height}%`,
                            minHeight: point.value > 0 ? "4px" : "0",
                          }}
                          title={`${point.label}: ${point.value} bookings`}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                          {point.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No chart data available for the selected filters
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading attendance data...</p>
              </div>
            ) : attendanceError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the attendance data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : attendanceData?.data ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {filters.groupBy === "each"
                          ? "Individual Attendances"
                          : "Grouped Results"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Showing data from {formatDate(filters.dateFrom)} to{" "}
                        {formatDate(filters.dateTo)}
                      </p>
                    </div>

                    {attendanceData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(attendanceData.data.pagination.page - 1) *
                          attendanceData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          attendanceData.data.pagination.page *
                            attendanceData.data.pagination.page_size,
                          attendanceData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {attendanceData.data.pagination.total_count.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  {filters.groupBy === "each" &&
                  attendanceData.data.attendances ? (
                    /* Individual attendances table */
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Customer
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Class
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Date & Time
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Venue
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Status
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Method
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Checked In
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.data.attendances.map((record) => (
                          <tr
                            key={record.booking_id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">
                                  {record.first_name} {record.last_name}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {record.email}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {record.class_type_name}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {record.duration_min} min
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {new Date(
                                    record.class_start_at,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {new Date(
                                    record.class_start_at,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {record.venue_name}
                                </p>
                                {record.room_location && (
                                  <p className="text-sm text-gray-400">
                                    {record.room_location}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  record.attendance_status === "attended"
                                    ? "bg-green-900 text-green-300"
                                    : record.attendance_status === "registered"
                                      ? "bg-blue-900 text-blue-300"
                                      : record.attendance_status === "no_show"
                                        ? "bg-red-900 text-red-300"
                                        : "bg-yellow-900 text-yellow-300"
                                }`}
                              >
                                {record.attendance_status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white capitalize">
                                  {record.booking_method}
                                </p>
                                <p className="text-sm text-gray-400 capitalize">
                                  {record.booking_source}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              {record.checked_in_at ? (
                                <div>
                                  <p className="text-white">
                                    {new Date(
                                      record.checked_in_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {record.was_late && record.minutes_late && (
                                    <p className="text-sm text-yellow-400">
                                      {Math.round(record.minutes_late)} min late
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Grouped data table */
                    attendanceData.data.grouped_data && (
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              {GROUP_BY_OPTIONS.find(
                                (opt) => opt.value === filters.groupBy,
                              )?.label || "Group"}
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Total Bookings
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Attended
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              No Shows
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Cancelled
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Attendance Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.data.grouped_data.map(
                            (group, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-700 hover:bg-gray-750"
                              >
                                <td className="p-4">
                                  <p className="text-white font-medium">
                                    {group.group_label}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-white">
                                    {group.total_bookings.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-green-400">
                                    {group.attended_count.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-red-400">
                                    {group.no_show_count.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-yellow-400">
                                    {group.cancelled_count.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-orange-500 h-2 rounded-full"
                                        style={{
                                          width: `${group.attendance_rate}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-white text-sm">
                                      {group.attendance_rate}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )
                  )}
                </div>

                {/* Pagination */}
                {attendanceData.data.pagination &&
                  attendanceData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {attendanceData.data.pagination.page} of{" "}
                          {attendanceData.data.pagination.total_pages}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateFilters({
                                page: Math.max(1, filters.page - 1),
                              })
                            }
                            disabled={filters.page <= 1}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          <span className="px-3 py-1 text-white">
                            {filters.page}
                          </span>

                          <button
                            onClick={() =>
                              updateFilters({ page: filters.page + 1 })
                            }
                            disabled={
                              filters.page >=
                              attendanceData.data.pagination.total_pages
                            }
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Data Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No attendance records found for the selected filters and date
                  range.
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or selecting a different date
                  range.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
