"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Calendar,
  Download,
  Filter,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  Play,
  SkipForward,
  DollarSign,
  Users,
  TrendingUp,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import {
  BillingSchedule,
  BillingScheduleFilters,
  BillingSchedulesResponse,
  BillingScheduleAction,
  DatePreset,
} from "@/app/types/billing";

// Generate month presets (current month + next 6 months)
const getMonthPresets = (): DatePreset[] => {
  const presets: DatePreset[] = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    presets.push({
      label: monthName,
      getValue: () => {
        const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); // Last day of month
        to.setHours(23, 59, 59, 999);
        return { from, to };
      },
    });
  }

  return presets;
};

const MONTH_PRESETS = getMonthPresets();

// Processor options
const PROCESSOR_OPTIONS = [
  { value: "stripe", label: "Stripe" },
  { value: "gocardless", label: "GoCardless" },
  { value: "cash", label: "Cash" },
  { value: "account_credit", label: "Account Credit" },
];

// Status options
const STATUS_OPTIONS = [
  {
    value: "scheduled",
    label: "Scheduled",
    color: "text-green-500",
    bg: "bg-green-900",
  },
  {
    value: "paused",
    label: "Paused",
    color: "text-yellow-500",
    bg: "bg-yellow-900",
  },
  {
    value: "skipped",
    label: "Skipped",
    color: "text-gray-500",
    bg: "bg-gray-900",
  },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UpcomingBillingPageContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<{
    schedule: BillingSchedule;
    action: "pause" | "resume" | "skip";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  // Filters state
  const [filters, setFilters] = useState<BillingScheduleFilters>(() => {
    const defaultDateRange = MONTH_PRESETS[0].getValue(); // Current month
    return {
      date_from:
        searchParams?.get("date_from") ||
        defaultDateRange.from.toISOString().split("T")[0],
      date_to:
        searchParams?.get("date_to") ||
        defaultDateRange.to.toISOString().split("T")[0],
      customer_id: searchParams?.get("customer_id") || undefined,
      membership_id: searchParams?.get("membership_id") || undefined,
      processor: searchParams?.getAll("processor") || [],
      status: searchParams?.getAll("status") || [],
      search: searchParams?.get("search") || "",
      page: parseInt(searchParams?.get("page") || "1"),
      page_size: parseInt(searchParams?.get("page_size") || "50"),
    };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.customer_id) params.set("customer_id", filters.customer_id);
    if (filters.membership_id)
      params.set("membership_id", filters.membership_id);
    filters.processor?.forEach((p) => params.append("processor", p));
    filters.status?.forEach((s) => params.append("status", s));
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size)
      params.set("page_size", filters.page_size.toString());

    return `/api/reports/upcoming-billing?${params.toString()}`;
  }, [filters]);

  // Fetch billing schedule data
  const {
    data: billingData,
    error: billingError,
    isLoading,
    mutate,
  } = useSWR<BillingSchedulesResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
    revalidateOnFocus: false,
  });

  // Handle filter changes
  const updateFilters = (newFilters: Partial<BillingScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  // Handle date preset selection
  const handleDatePreset = (preset: DatePreset) => {
    const { from, to } = preset.getValue();
    updateFilters({
      date_from: from.toISOString().split("T")[0],
      date_to: to.toISOString().split("T")[0],
    });
    setCustomDateRange(false);
  };

  // Get current month index from filters
  const getCurrentMonthIndex = (): number => {
    if (!filters.date_from || !filters.date_to) return 0;

    // Try to match current filters to a month preset
    for (let i = 0; i < MONTH_PRESETS.length; i++) {
      const { from, to } = MONTH_PRESETS[i].getValue();
      const presetFrom = from.toISOString().split("T")[0];
      const presetTo = to.toISOString().split("T")[0];

      if (filters.date_from === presetFrom && filters.date_to === presetTo) {
        return i;
      }
    }

    return 0; // Default to current month
  };

  // Handle action
  const handleAction = async (
    schedule: BillingSchedule,
    action: "pause" | "resume" | "skip",
  ) => {
    if (action === "pause" || action === "skip") {
      setShowActionModal({ schedule, action });
      return;
    }

    // Resume can be done directly
    await performAction(schedule.id, { action });
  };

  // Perform action
  const performAction = async (
    scheduleId: string,
    actionData: BillingScheduleAction,
  ) => {
    setActionLoading(scheduleId);
    try {
      const response = await fetch(
        `/api/reports/upcoming-billing/${scheduleId}/actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(actionData),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Refresh data
        mutate();
        setShowActionModal(null);
        setActionReason("");
      } else {
        console.error("Action failed:", result.error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error("Action error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle CSV export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.membership_id)
        params.set("membership_id", filters.membership_id);
      filters.processor?.forEach((p) => params.append("processor", p));
      filters.status?.forEach((s) => params.append("status", s));
      if (filters.search) params.set("search", filters.search);

      const response = await fetch(
        `/api/reports/upcoming-billing/export?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `upcoming-billing-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
    return statusOption || { color: "text-gray-500", bg: "bg-gray-900" };
  };

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
                  Upcoming Billing
                </h1>
                <p className="text-gray-400">
                  Manage upcoming billing schedules and payment processing
                </p>
              </div>

              <div className="flex items-center gap-3">
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
            </div>

            {showFilters && (
              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.search || ""}
                      onChange={(e) =>
                        updateFilters({ search: e.target.value })
                      }
                      placeholder="Search by customer name, email, membership, or description..."
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 w-full"
                    />
                    {filters.search && (
                      <button
                        onClick={() => updateFilters({ search: "" })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Range - Month Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Month
                  </label>
                  <select
                    value={customDateRange ? "custom" : getCurrentMonthIndex()}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setCustomDateRange(true);
                      } else {
                        setCustomDateRange(false);
                        const preset = MONTH_PRESETS[parseInt(e.target.value)];
                        handleDatePreset(preset);
                      }
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {MONTH_PRESETS.map((preset, index) => (
                      <option key={preset.label} value={index}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">Custom Range</option>
                  </select>

                  {customDateRange && (
                    <div className="flex gap-4 mt-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">
                          From
                        </label>
                        <input
                          type="date"
                          value={filters.date_from || ""}
                          onChange={(e) =>
                            updateFilters({ date_from: e.target.value })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">
                          To
                        </label>
                        <input
                          type="date"
                          value={filters.date_to || ""}
                          onChange={(e) =>
                            updateFilters({ date_to: e.target.value })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={
                            filters.status?.includes(option.value) || false
                          }
                          onChange={(e) => {
                            const currentStatus = filters.status || [];
                            if (e.target.checked) {
                              updateFilters({
                                status: [...currentStatus, option.value],
                              });
                            } else {
                              updateFilters({
                                status: currentStatus.filter(
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

                {/* Processor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Processor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROCESSOR_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={
                            filters.processor?.includes(option.value) || false
                          }
                          onChange={(e) => {
                            const currentProcessors = filters.processor || [];
                            if (e.target.checked) {
                              updateFilters({
                                processor: [...currentProcessors, option.value],
                              });
                            } else {
                              updateFilters({
                                processor: currentProcessors.filter(
                                  (p) => p !== option.value,
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
            )}
          </div>

          {/* Summary Stats */}
          {billingData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Scheduled</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(billingData.data.summary.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {billingData.data.summary.total_scheduled} schedules
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">This Week</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(
                        billingData.data.summary.this_week_amount,
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {billingData.data.summary.this_week_count} due
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Next Week</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {formatCurrency(
                        billingData.data.summary.next_week_amount,
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {billingData.data.summary.next_week_count} due
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Paused</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {formatCurrency(billingData.data.summary.paused_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {billingData.data.summary.paused_count} paused
                    </p>
                  </div>
                  <Pause className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading billing schedules...</p>
              </div>
            ) : billingError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the billing schedule data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : billingData?.data?.schedules?.length ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Billing Schedules
                      </h3>
                      <p className="text-sm text-gray-400">
                        Showing data from{" "}
                        {formatDate(filters.date_from + "T00:00:00Z")} to{" "}
                        {formatDate(filters.date_to + "T23:59:59Z")}
                      </p>
                    </div>

                    {billingData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(billingData.data.pagination.page - 1) *
                          billingData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          billingData.data.pagination.page *
                            billingData.data.pagination.page_size,
                          billingData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {billingData.data.pagination.total_count.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Due Date
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Customer
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Membership
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Amount
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Processor
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.data.schedules.map((schedule) => {
                        const statusDisplay = getStatusDisplay(schedule.status);

                        return (
                          <tr
                            key={schedule.id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            <td className="p-4">
                              <p className="text-white font-medium">
                                {formatDate(schedule.due_at)}
                              </p>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">
                                  {schedule.customer_name || "Unknown Customer"}
                                </p>
                                {schedule.email && (
                                  <p className="text-sm text-gray-400">
                                    {schedule.email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-white">
                                {schedule.membership_plan_name || "-"}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="text-white font-semibold">
                                {formatCurrency(schedule.amount)}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="text-white capitalize">
                                {schedule.processor}
                              </p>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}
                              >
                                {schedule.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {schedule.status === "scheduled" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleAction(schedule, "pause")
                                      }
                                      disabled={actionLoading === schedule.id}
                                      className="p-1 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                                      title="Pause"
                                    >
                                      <Pause className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleAction(schedule, "skip")
                                      }
                                      disabled={actionLoading === schedule.id}
                                      className="p-1 text-gray-400 hover:text-orange-400 transition-colors disabled:opacity-50"
                                      title="Skip"
                                    >
                                      <SkipForward className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {schedule.status === "paused" && (
                                  <button
                                    onClick={() =>
                                      handleAction(schedule, "resume")
                                    }
                                    disabled={actionLoading === schedule.id}
                                    className="p-1 text-gray-400 hover:text-green-400 transition-colors disabled:opacity-50"
                                    title="Resume"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                )}
                                {actionLoading === schedule.id && (
                                  <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {billingData.data.pagination &&
                  billingData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {billingData.data.pagination.page} of{" "}
                          {billingData.data.pagination.total_pages}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateFilters({
                                page: Math.max(1, (filters.page || 1) - 1),
                              })
                            }
                            disabled={(filters.page || 1) <= 1}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          <span className="px-3 py-1 text-white">
                            {filters.page || 1}
                          </span>

                          <button
                            onClick={() =>
                              updateFilters({ page: (filters.page || 1) + 1 })
                            }
                            disabled={
                              (filters.page || 1) >=
                              billingData.data.pagination.total_pages
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
                  No Billing Schedules Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No upcoming billing schedules found for the selected filters
                  and date range.
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or selecting a different date
                  range.
                </p>
              </div>
            )}
          </div>

          {/* Action Modal */}
          {showActionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {showActionModal.action === "pause" ? "Pause" : "Skip"}{" "}
                    Billing Schedule
                  </h3>
                  <button
                    onClick={() => setShowActionModal(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-gray-300 mb-2">
                    Are you sure you want to {showActionModal.action} the
                    billing schedule for{" "}
                    <span className="font-medium text-white">
                      {showActionModal.schedule.customer_name}
                    </span>
                    ?
                  </p>
                  <div className="bg-gray-700 p-3 rounded border border-gray-600">
                    <p className="text-sm text-gray-300">
                      Amount:{" "}
                      <span className="text-white font-medium">
                        {formatCurrency(showActionModal.schedule.amount)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Due:{" "}
                      <span className="text-white">
                        {formatDate(showActionModal.schedule.due_at)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={`Reason for ${showActionModal.action}ing this billing schedule...`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      performAction(showActionModal.schedule.id, {
                        action: showActionModal.action,
                        reason: actionReason || undefined,
                      })
                    }
                    disabled={actionLoading === showActionModal.schedule.id}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === showActionModal.schedule.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      `${showActionModal.action === "pause" ? "Pause" : "Skip"} Schedule`
                    )}
                  </button>
                  <button
                    onClick={() => setShowActionModal(null)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
export default function UpcomingBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading report...
            </p>
          </div>
        </div>
      }
    >
      <UpcomingBillingPageContent />
    </Suspense>
  );
}
