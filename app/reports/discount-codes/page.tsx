"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Tag,
  Download,
  Filter,
  BarChart3,
  Users,
  DollarSign,
  Trophy,
  TrendingUp,
  ChevronDown,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Calendar,
  Percent,
  ShoppingCart,
} from "lucide-react";
import {
  DiscountCodeFilters,
  DiscountCodeResponse,
  DiscountUsageRecord,
  DiscountGroupedData,
  DiscountGroupBy,
  UseType,
  DatePreset,
  FilterOption,
  CustomerOption,
  DiscountCodeOption,
  GroupOption,
} from "@/app/types/discount-codes";

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
    label: "Last 30 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { from: start, to: end };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: start, to: end };
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: end };
    },
  },
  {
    label: "This year",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear() + 1, 0, 1);
      return { from: start, to: end };
    },
  },
];

const GROUP_BY_OPTIONS = [
  { value: "each", label: "Individual Uses" },
  { value: "customer", label: "By Customer" },
  { value: "discount_code", label: "By Discount Code" },
  { value: "group", label: "By Group" },
  { value: "use_type", label: "By Use Type" },
  { value: "use_year", label: "By Year" },
  { value: "use_month", label: "By Month" },
];

const USE_TYPE_OPTIONS = [
  { value: "class", label: "Class" },
  { value: "course", label: "Course" },
  { value: "membership", label: "Membership" },
  { value: "store", label: "Store" },
];

interface FilterState {
  view: "all" | "grouped";
  dateFrom: string;
  dateTo: string;
  customerId?: string;
  codeId?: string;
  groupName?: string;
  useType?: UseType;
  groupBy: DiscountGroupBy;
  page: number;
  pageSize: number;
  showChart: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DiscountCodesReportPage() {
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
      view: (searchParams?.get("view") as "all" | "grouped") || "all",
      dateFrom:
        searchParams?.get("date_from") || defaultDateRange.from.toISOString(),
      dateTo: searchParams?.get("date_to") || defaultDateRange.to.toISOString(),
      customerId: searchParams?.get("customer_id") || undefined,
      codeId: searchParams?.get("code_id") || undefined,
      groupName: searchParams?.get("group_name") || undefined,
      useType: (searchParams?.get("use_type") as UseType) || undefined,
      groupBy: (searchParams?.get("group_by") as DiscountGroupBy) || "each",
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

    params.set("view", filters.view);
    params.set("date_from", filters.dateFrom);
    params.set("date_to", filters.dateTo);

    if (filters.customerId) params.set("customer_id", filters.customerId);
    if (filters.codeId) params.set("code_id", filters.codeId);
    if (filters.groupName) params.set("group_name", filters.groupName);
    if (filters.useType) params.set("use_type", filters.useType);

    params.set("group_by", filters.groupBy);
    params.set("page", filters.page.toString());
    params.set("page_size", filters.pageSize.toString());

    return `/api/reports/discount-codes?${params.toString()}`;
  }, [filters]);

  // Fetch discount codes data
  const {
    data: discountData,
    error: discountError,
    isLoading,
    mutate,
  } = useSWR<DiscountCodeResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
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

  // Handle view/groupBy change
  const handleShowChange = (value: string) => {
    if (value === "all") {
      updateFilters({ view: "all", groupBy: "each" });
    } else if (value === "grouped") {
      updateFilters({ view: "grouped", groupBy: "discount_code" });
    } else {
      updateFilters({ view: "all", groupBy: value as DiscountGroupBy });
    }
  };

  // Handle CSV export
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date_from", filters.dateFrom);
      params.set("date_to", filters.dateTo);

      if (filters.customerId) params.set("customer_id", filters.customerId);
      if (filters.codeId) params.set("code_id", filters.codeId);
      if (filters.groupName) params.set("group_name", filters.groupName);
      if (filters.useType) params.set("use_type", filters.useType);

      const response = await fetch(
        `/api/reports/discount-codes/export?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `discount-codes-report-${new Date().toISOString().split("T")[0]}.csv`;
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

  // Format currency
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!discountData?.data) return null;

    if (
      filters.view === "all" &&
      filters.groupBy === "each" &&
      discountData.data.uses
    ) {
      const uses = discountData.data.uses;
      const uniqueCodes = new Set(uses.map((u) => u.code_id)).size;
      const totalDiscounted = uses.reduce(
        (sum, u) => sum + u.amount_discounted_cents,
        0,
      );

      // Find most popular code
      const codeUsage: Record<
        string,
        { code: string; name: string; count: number }
      > = {};
      uses.forEach((use) => {
        const key = use.code_id;
        if (!codeUsage[key]) {
          codeUsage[key] = {
            code: use.code,
            name: use.discount_name,
            count: 0,
          };
        }
        codeUsage[key].count++;
      });

      const mostPopular = Object.values(codeUsage).sort(
        (a, b) => b.count - a.count,
      )[0];

      return {
        totalUses: uses.length,
        uniqueCodes,
        totalDiscounted,
        avgDiscount:
          uses.length > 0 ? Math.round(totalDiscounted / uses.length) : 0,
        mostPopularCode: mostPopular || null,
      };
    } else if (discountData.data.grouped_data) {
      const groups = discountData.data.grouped_data;
      const totals = groups.reduce(
        (acc, group) => ({
          totalUses: acc.totalUses + group.total_uses,
          uniqueCodes: acc.uniqueCodes + group.unique_codes,
          totalDiscounted: acc.totalDiscounted + group.total_discounted_cents,
        }),
        { totalUses: 0, uniqueCodes: 0, totalDiscounted: 0 },
      );

      // Most popular code is the one with highest usage
      const mostPopular = groups
        .filter((g) => g.most_used_code)
        .sort(
          (a, b) => (b.most_used_code_uses || 0) - (a.most_used_code_uses || 0),
        )[0];

      return {
        totalUses: totals.totalUses,
        uniqueCodes: totals.uniqueCodes,
        totalDiscounted: totals.totalDiscounted,
        avgDiscount:
          totals.totalUses > 0
            ? Math.round(totals.totalDiscounted / totals.totalUses)
            : 0,
        mostPopularCode: mostPopular
          ? {
              code: mostPopular.most_used_code!.split("_")[0],
              name: mostPopular.group_label,
              count: mostPopular.most_used_code_uses!,
            }
          : null,
      };
    }

    return null;
  }, [discountData, filters]);

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
                  Discount Codes Usage
                </h1>
                <p className="text-gray-400">
                  Track discount code usage across all types and time periods
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

                {/* Show Menu */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Show
                  </label>
                  <select
                    value={
                      filters.view === "grouped" ? "grouped" : filters.groupBy
                    }
                    onChange={(e) => handleShowChange(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full md:w-auto"
                  >
                    <option value="each">All Results (Individual Uses)</option>
                    <optgroup label="Results grouped by:">
                      <option value="customer">Customer</option>
                      <option value="discount_code">Discount Code</option>
                      <option value="group">Group</option>
                      <option value="use_type">Use Type</option>
                      <option value="use_year">Use Year</option>
                      <option value="use_month">Use Month</option>
                    </optgroup>
                  </select>
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Use Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Use Type
                    </label>
                    <select
                      value={filters.useType || ""}
                      onChange={(e) =>
                        updateFilters({
                          useType: (e.target.value as UseType) || undefined,
                        })
                      }
                      className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full"
                    >
                      <option value="">All Types</option>
                      {USE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Group Name Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Group
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by group name"
                      value={filters.groupName || ""}
                      onChange={(e) =>
                        updateFilters({
                          groupName: e.target.value || undefined,
                        })
                      }
                      className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full placeholder-gray-400"
                    />
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
                    <p className="text-sm text-gray-400">Total Uses</p>
                    <p className="text-2xl font-bold text-white">
                      {summaryStats.totalUses.toLocaleString()}
                    </p>
                  </div>
                  <Tag className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Unique Codes</p>
                    <p className="text-2xl font-bold text-green-500">
                      {summaryStats.uniqueCodes.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Discounted</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {formatCurrency(summaryStats.totalDiscounted)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Discount</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {formatCurrency(summaryStats.avgDiscount)}
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Most Popular</p>
                    <p className="text-lg font-bold text-orange-500 truncate">
                      {summaryStats.mostPopularCode?.code || "N/A"}
                    </p>
                    {summaryStats.mostPopularCode && (
                      <p className="text-xs text-gray-400">
                        {summaryStats.mostPopularCode.count} uses
                      </p>
                    )}
                  </div>
                  <Trophy className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading discount codes data...</p>
              </div>
            ) : discountError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the discount codes data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : discountData?.data ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {filters.view === "all" && filters.groupBy === "each"
                          ? "Individual Uses"
                          : "Grouped Results"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Showing data from {formatDate(filters.dateFrom)} to{" "}
                        {formatDate(filters.dateTo)}
                      </p>
                    </div>

                    {discountData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(discountData.data.pagination.page - 1) *
                          discountData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          discountData.data.pagination.page *
                            discountData.data.pagination.page_size,
                          discountData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {discountData.data.pagination.total_count.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  {filters.view === "all" &&
                  filters.groupBy === "each" &&
                  discountData.data.uses ? (
                    /* Individual uses table */
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Code
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Customer
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Used At
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Type
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Used For
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Discount
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-300">
                            Group
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {discountData.data.uses.map((use) => (
                          <tr
                            key={use.id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            <td className="p-4">
                              <div>
                                <p className="text-white font-medium">
                                  {use.code}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {use.discount_name}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {use.customer_name || "Unknown"}
                                </p>
                                {use.email && (
                                  <p className="text-sm text-gray-400">
                                    {use.email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-white">
                                  {new Date(use.used_at).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {new Date(use.used_at).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                                {use.use_type}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="text-white">
                                {use.used_for || "-"}
                              </p>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-green-400 font-medium">
                                  {formatCurrency(use.amount_discounted_cents)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {use.discount_type === "percentage"
                                    ? `${use.discount_value}%`
                                    : formatCurrency(use.discount_value)}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-300">
                                {use.group_name || "-"}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Grouped data table */
                    discountData.data.grouped_data && (
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              {GROUP_BY_OPTIONS.find(
                                (opt) => opt.value === filters.groupBy,
                              )?.label || "Group"}
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Total Uses
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Unique Codes
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Total Discounted
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Avg Discount
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-300">
                              Customers
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {discountData.data.grouped_data.map(
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
                                    {group.total_uses.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-blue-400">
                                    {group.unique_codes.toLocaleString()}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-green-400">
                                    {formatCurrency(
                                      group.total_discounted_cents,
                                    )}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-purple-400">
                                    {formatCurrency(
                                      group.average_discount_cents,
                                    )}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-orange-400">
                                    {group.customers_count.toLocaleString()}
                                  </p>
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
                {discountData.data.pagination &&
                  discountData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {discountData.data.pagination.page} of{" "}
                          {discountData.data.pagination.total_pages}
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
                              discountData.data.pagination.total_pages
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
                <Tag className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Data Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No discount code usage found for the selected filters and date
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
