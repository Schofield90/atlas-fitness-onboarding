"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Clock,
  Download,
  Filter,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Users,
  Globe,
  FileText,
  ChevronDown,
  Eye,
} from "lucide-react";
import {
  PendingPayment,
  PendingPaymentFilters,
  PendingPaymentsResponse,
  DatePreset,
} from "@/app/types/billing";

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
    label: "Last 7 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { from: start, to: end };
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
    label: "Last 60 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 60);
      return { from: start, to: end };
    },
  },
  {
    label: "Last 90 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90);
      return { from: start, to: end };
    },
  },
];

// Processor options
const PROCESSOR_OPTIONS = [
  { value: "stripe", label: "Stripe" },
  { value: "gocardless", label: "GoCardless" },
  { value: "cash", label: "Cash" },
  { value: "account_credit", label: "Account Credit" },
];

// Pending type options
const PENDING_TYPE_OPTIONS = [
  {
    value: "online",
    label: "Online",
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-900",
  },
  {
    value: "offline",
    label: "Offline",
    icon: FileText,
    color: "text-gray-500",
    bg: "bg-gray-900",
  },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PendingPaymentsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<PendingPaymentFilters>(() => {
    const defaultDateRange = DATE_PRESETS[2].getValue(); // Last 30 days
    return {
      pending_type: searchParams?.get("pending_type") as
        | "online"
        | "offline"
        | undefined,
      date_from:
        searchParams?.get("date_from") ||
        defaultDateRange.from.toISOString().split("T")[0],
      date_to:
        searchParams?.get("date_to") ||
        defaultDateRange.to.toISOString().split("T")[0],
      customer_id: searchParams?.get("customer_id") || undefined,
      processor: searchParams?.getAll("processor") || [],
      search: searchParams?.get("search") || "",
      page: parseInt(searchParams?.get("page") || "1"),
      page_size: parseInt(searchParams?.get("page_size") || "50"),
    };
  });

  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    const pendingType = searchParams?.get("pending_type");
    if (pendingType === "online") return "online";
    if (pendingType === "offline") return "offline";
    return "all";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.pending_type) params.set("pending_type", filters.pending_type);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.customer_id) params.set("customer_id", filters.customer_id);
    filters.processor?.forEach((p) => params.append("processor", p));
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size)
      params.set("page_size", filters.page_size.toString());

    return `/api/reports/pending?${params.toString()}`;
  }, [filters]);

  // Fetch pending payments data
  const {
    data: paymentsData,
    error: paymentsError,
    isLoading,
    mutate,
  } = useSWR<PendingPaymentsResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
    revalidateOnFocus: false,
  });

  // Handle filter changes
  const updateFilters = (newFilters: Partial<PendingPaymentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    updateFilters({
      pending_type: tab === "all" ? undefined : (tab as "online" | "offline"),
    });
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

  // Handle CSV export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.pending_type)
        params.set("pending_type", filters.pending_type);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      filters.processor?.forEach((p) => params.append("processor", p));
      if (filters.search) params.set("search", filters.search);

      const response = await fetch(
        `/api/reports/pending/export?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pending-payments-${new Date().toISOString().split("T")[0]}.csv`;
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
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  // Get pending type display
  const getPendingTypeDisplay = (type: string) => {
    const typeOption = PENDING_TYPE_OPTIONS.find((opt) => opt.value === type);
    return (
      typeOption || { icon: Clock, color: "text-gray-500", bg: "bg-gray-900" }
    );
  };

  // Calculate days since pending
  const getDaysSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
                  Pending Payments
                </h1>
                <p className="text-gray-400">
                  Monitor and track pending payment transactions
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

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: "all", label: "All Pending" },
                { key: "online", label: "Online Pending" },
                { key: "offline", label: "Offline Pending" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {paymentsData?.data?.summary && (
                    <span className="ml-2 bg-gray-700 text-gray-300 py-0.5 px-2 rounded-full text-xs">
                      {tab.key === "all"
                        ? paymentsData.data.summary.total_pending
                        : tab.key === "online"
                          ? paymentsData.data.summary.online_pending
                          : paymentsData.data.summary.offline_pending}
                    </span>
                  )}
                </button>
              ))}
            </nav>
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
                      placeholder="Search by customer name, email, invoice number, or notes..."
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
                          value={filters.date_from || ""}
                          onChange={(e) =>
                            updateFilters({ date_from: e.target.value })
                          }
                          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          To
                        </label>
                        <input
                          type="date"
                          value={filters.date_to || ""}
                          onChange={(e) =>
                            updateFilters({ date_to: e.target.value })
                          }
                          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
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
          {paymentsData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Pending</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(paymentsData.data.summary.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {paymentsData.data.summary.total_pending} payments
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Online Pending</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {formatCurrency(paymentsData.data.summary.online_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {paymentsData.data.summary.online_pending} payments
                    </p>
                  </div>
                  <Globe className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Offline Pending</p>
                    <p className="text-2xl font-bold text-gray-500">
                      {formatCurrency(paymentsData.data.summary.offline_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {paymentsData.data.summary.offline_pending} payments
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-500" />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading pending payments...</p>
              </div>
            ) : paymentsError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the pending payments data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : paymentsData?.data?.payments?.length ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Pending Payments
                      </h3>
                      <p className="text-sm text-gray-400">
                        Showing data from {formatDate(filters.date_from || "")}{" "}
                        to {formatDate(filters.date_to || "")}
                      </p>
                    </div>

                    {paymentsData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(paymentsData.data.pagination.page - 1) *
                          paymentsData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          paymentsData.data.pagination.page *
                            paymentsData.data.pagination.page_size,
                          paymentsData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {paymentsData.data.pagination.total_count.toLocaleString()}
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
                          Customer
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Pending Since
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Invoice Date
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Amount
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Processor
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Type
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsData.data.payments.map((payment) => {
                        const typeDisplay = getPendingTypeDisplay(
                          payment.pending_type,
                        );
                        const TypeIcon = typeDisplay.icon;
                        const daysSince = getDaysSince(payment.created_at);

                        return (
                          <tr
                            key={payment.id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">
                                  {payment.customer_name || "Unknown Customer"}
                                </p>
                                {payment.email && (
                                  <p className="text-sm text-gray-400">
                                    {payment.email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {formatDate(payment.created_at)}
                                </p>
                                <p
                                  className={`text-xs ${
                                    daysSince <= 3
                                      ? "text-green-400"
                                      : daysSince <= 7
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
                                  {daysSince} day{daysSince !== 1 ? "s" : ""}{" "}
                                  ago
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {payment.invoice_date
                                    ? formatDate(payment.invoice_date)
                                    : "-"}
                                </p>
                                {payment.invoice_number && (
                                  <p className="text-sm text-gray-400">
                                    #{payment.invoice_number}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-white font-semibold">
                                {formatCurrency(payment.amount)}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="text-white capitalize">
                                {payment.processor}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <TypeIcon
                                  className={`h-4 w-4 ${typeDisplay.color}`}
                                />
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeDisplay.bg} ${typeDisplay.color}`}
                                >
                                  {payment.pending_type}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-white text-sm">
                                {payment.notes || "-"}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {paymentsData.data.pagination &&
                  paymentsData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {paymentsData.data.pagination.page} of{" "}
                          {paymentsData.data.pagination.total_pages}
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
                              paymentsData.data.pagination.total_pages
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
                <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Pending Payments Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No pending payments found for the selected filters and date
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
