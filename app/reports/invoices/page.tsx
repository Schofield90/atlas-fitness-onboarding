"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Receipt,
  Download,
  Filter,
  Settings,
  Search,
  X,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Eye,
  RotateCcw,
  ChevronDown,
  Columns3,
} from "lucide-react";
import {
  Invoice,
  InvoiceFilters,
  InvoicesResponse,
  InvoiceColumn,
  InvoiceTab,
  DatePreset,
  CustomerOption,
  MembershipOption,
} from "@/app/types/invoices";

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
    label: "Last 30 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
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

// Processor options
const PROCESSOR_OPTIONS = [
  { value: "stripe", label: "Stripe" },
  { value: "gocardless", label: "GoCardless" },
  { value: "cash", label: "Cash" },
  { value: "account_credit", label: "Account Credit" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InvoicesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<InvoiceFilters>(() => {
    const defaultDateRange = DATE_PRESETS[3].getValue(); // Last 30 days
    return {
      status: searchParams?.getAll("status") || [],
      time: (searchParams?.get("time") as "preset" | "custom") || "preset",
      date_from:
        searchParams?.get("date_from") ||
        defaultDateRange.from.toISOString().split("T")[0],
      date_to:
        searchParams?.get("date_to") ||
        defaultDateRange.to.toISOString().split("T")[0],
      customer_id: searchParams?.get("customer_id") || undefined,
      membership_id: searchParams?.get("membership_id") || undefined,
      processor: searchParams?.getAll("processor") || [],
      search: searchParams?.get("search") || "",
      page: parseInt(searchParams?.get("page") || "1"),
      page_size: parseInt(searchParams?.get("page_size") || "50"),
    };
  });

  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    const status = searchParams?.getAll("status") || [];
    if (status.includes("pending") && status.includes("offline"))
      return "pending_offline";
    if (status.includes("failed")) return "failed";
    if (status.includes("pending") || status.includes("retrying"))
      return "open";
    return "all";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    filters.status?.forEach((s) => params.append("status", s));
    if (filters.time) params.set("time", filters.time);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.customer_id) params.set("customer_id", filters.customer_id);
    if (filters.membership_id)
      params.set("membership_id", filters.membership_id);
    filters.processor?.forEach((p) => params.append("processor", p));
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size)
      params.set("page_size", filters.page_size.toString());

    return `/api/reports/invoices?${params.toString()}`;
  }, [filters]);

  // Fetch invoice data
  const {
    data: invoiceData,
    error: invoiceError,
    isLoading,
    mutate,
  } = useSWR<InvoicesResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
    revalidateOnFocus: false,
  });

  // Fetch column preferences
  const { data: columnData, mutate: mutateColumns } = useSWR(
    "/api/reports/invoices/columns",
    fetcher,
  );

  const columns: InvoiceColumn[] = columnData?.data?.columns || [];

  // Define tabs with dynamic counts
  const tabs: InvoiceTab[] = useMemo(() => {
    const summary = invoiceData?.data?.summary;
    return [
      {
        key: "all",
        label: "All",
        count: summary?.total_invoices,
      },
      {
        key: "pending_offline",
        label: "Pending Offline",
        status_filter: ["pending", "offline"],
      },
      {
        key: "failed",
        label: "Failed",
        status_filter: ["failed"],
      },
      {
        key: "open",
        label: "Open",
        status_filter: ["pending", "retrying"],
      },
    ];
  }, [invoiceData?.data?.summary]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  // Handle tab change
  const handleTabChange = (tab: InvoiceTab) => {
    setActiveTab(tab.key);
    updateFilters({
      status: tab.status_filter || [],
    });
  };

  // Handle date preset selection
  const handleDatePreset = (preset: DatePreset) => {
    const { from, to } = preset.getValue();
    updateFilters({
      time: "preset",
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

      filters.status?.forEach((s) => params.append("status", s));
      if (filters.time) params.set("time", filters.time);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.membership_id)
        params.set("membership_id", filters.membership_id);
      filters.processor?.forEach((p) => params.append("processor", p));
      if (filters.search) params.set("search", filters.search);

      const response = await fetch(
        `/api/reports/invoices/export?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoices-report-${new Date().toISOString().split("T")[0]}.csv`;
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

  // Handle column preferences save
  const handleSaveColumns = async (newColumns: InvoiceColumn[]) => {
    try {
      const response = await fetch("/api/reports/invoices/columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ columns: newColumns }),
      });

      if (response.ok) {
        mutateColumns();
        setShowColumnConfig(false);
      }
    } catch (error) {
      console.error("Failed to save column preferences:", error);
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

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "paid":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bg: "bg-green-900",
        };
      case "pending":
        return { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-900" };
      case "offline":
        return { icon: FileText, color: "text-blue-500", bg: "bg-blue-900" };
      case "retrying":
        return {
          icon: RefreshCw,
          color: "text-orange-500",
          bg: "bg-orange-900",
        };
      case "failed":
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-900" };
      default:
        return { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-900" };
    }
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
                <h1 className="text-3xl font-bold text-white mb-2">Invoices</h1>
                <p className="text-gray-400">
                  Complete invoice reporting and payment tracking
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowColumnConfig(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <Columns3 className="h-4 w-4" />
                  Columns
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

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-gray-700 text-gray-300 py-0.5 px-2 rounded-full text-xs">
                      {tab.count.toLocaleString()}
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
                      placeholder="Search by customer name, email, invoice number, or description..."
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
                            updateFilters({
                              date_from: e.target.value,
                              time: "custom",
                            })
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
                            updateFilters({
                              date_to: e.target.value,
                              time: "custom",
                            })
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
          {invoiceData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Amount</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(invoiceData.data.summary.total_amount)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Paid</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(invoiceData.data.summary.paid_amount)}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {formatCurrency(invoiceData.data.summary.pending_amount)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Failed</p>
                    <p className="text-2xl font-bold text-red-500">
                      {formatCurrency(invoiceData.data.summary.failed_amount)}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading invoice data...</p>
              </div>
            ) : invoiceError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the invoice data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : invoiceData?.data?.invoices?.length ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Invoices
                      </h3>
                      <p className="text-sm text-gray-400">
                        Showing data from {formatDate(filters.date_from || "")}{" "}
                        to {formatDate(filters.date_to || "")}
                      </p>
                    </div>

                    {invoiceData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(invoiceData.data.pagination.page - 1) *
                          invoiceData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          invoiceData.data.pagination.page *
                            invoiceData.data.pagination.page_size,
                          invoiceData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {invoiceData.data.pagination.total_count.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        {columns
                          .filter((col) => col.enabled)
                          .map((column) => (
                            <th
                              key={column.key}
                              className="text-left p-4 text-sm font-medium text-gray-300"
                              style={{ width: column.width }}
                            >
                              {column.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.data.invoices.map((invoice) => {
                        const statusDisplay = getStatusDisplay(invoice.status);
                        const StatusIcon = statusDisplay.icon;

                        return (
                          <tr
                            key={invoice.id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            {columns
                              .filter((col) => col.enabled)
                              .map((column) => {
                                switch (column.key) {
                                  case "status":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <div className="flex items-center gap-2">
                                          <StatusIcon
                                            className={`h-4 w-4 ${statusDisplay.color}`}
                                          />
                                          <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}
                                          >
                                            {invoice.status}
                                          </span>
                                        </div>
                                      </td>
                                    );
                                  case "invoice_date":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {formatDate(invoice.invoice_date)}
                                        </p>
                                      </td>
                                    );
                                  case "payment_date":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {invoice.payment_date
                                            ? formatDate(invoice.payment_date)
                                            : "-"}
                                        </p>
                                      </td>
                                    );
                                  case "total":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white font-semibold">
                                          {formatCurrency(invoice.total)}
                                        </p>
                                      </td>
                                    );
                                  case "subtotal":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {formatCurrency(invoice.subtotal)}
                                        </p>
                                      </td>
                                    );
                                  case "tax":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {formatCurrency(invoice.tax)}
                                        </p>
                                      </td>
                                    );
                                  case "discount":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {formatCurrency(invoice.discount)}
                                        </p>
                                      </td>
                                    );
                                  case "fees":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {formatCurrency(invoice.fees)}
                                        </p>
                                      </td>
                                    );
                                  case "customer_name":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <div>
                                          <p className="text-white font-medium">
                                            {invoice.customer_name ||
                                              "Unknown Customer"}
                                          </p>
                                          {invoice.customer_email && (
                                            <p className="text-sm text-gray-400">
                                              {invoice.customer_email}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  case "membership_plan_name":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white">
                                          {invoice.membership_plan_name || "-"}
                                        </p>
                                      </td>
                                    );
                                  case "description":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <div>
                                          <p className="text-white">
                                            {invoice.description || "-"}
                                          </p>
                                          {invoice.item_count > 0 && (
                                            <p className="text-sm text-gray-400">
                                              {invoice.item_count} item
                                              {invoice.item_count !== 1
                                                ? "s"
                                                : ""}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  case "processor":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <p className="text-white capitalize">
                                          {invoice.processor}
                                        </p>
                                      </td>
                                    );
                                  case "actions":
                                    return (
                                      <td key={column.key} className="p-4">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              /* TODO: View PDF */
                                            }}
                                            className="p-1 text-gray-400 hover:text-white transition-colors"
                                            title="View PDF"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          {invoice.processor === "stripe" &&
                                            invoice.status === "paid" && (
                                              <button
                                                onClick={() => {
                                                  /* TODO: Refund */
                                                }}
                                                className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                                                title="Refund"
                                              >
                                                <RotateCcw className="h-4 w-4" />
                                              </button>
                                            )}
                                        </div>
                                      </td>
                                    );
                                  default:
                                    return (
                                      <td key={column.key} className="p-4"></td>
                                    );
                                }
                              })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {invoiceData.data.pagination &&
                  invoiceData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {invoiceData.data.pagination.page} of{" "}
                          {invoiceData.data.pagination.total_pages}
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
                              invoiceData.data.pagination.total_pages
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
                <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Invoices Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No invoices found for the selected filters and date range.
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or selecting a different date
                  range.
                </p>
              </div>
            )}
          </div>

          {/* Column Configuration Modal */}
          {showColumnConfig && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Configure Columns
                  </h3>
                  <button
                    onClick={() => setShowColumnConfig(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {columns.map((column, index) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-3 text-sm text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={column.enabled}
                        onChange={(e) => {
                          const newColumns = [...columns];
                          newColumns[index] = {
                            ...column,
                            enabled: e.target.checked,
                          };
                          // Don't save automatically, wait for user to click save
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-600"
                      />
                      {column.label}
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      // Save current state
                      handleSaveColumns(columns);
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setShowColumnConfig(false)}
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
