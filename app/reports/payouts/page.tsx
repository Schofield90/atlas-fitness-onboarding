"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Banknote,
  Download,
  Filter,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  Eye,
  DollarSign,
  CreditCard,
  Building2,
} from "lucide-react";
import {
  Payout,
  PayoutFilters,
  PayoutsResponse,
  MonthOption,
  ProcessorOption,
  PROCESSOR_OPTIONS,
  STATUS_OPTIONS,
  formatCurrency,
  formatDate,
  getProcessorColor,
  getStatusColor,
  generateMonthOptions,
} from "@/app/types/payouts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function PayoutsReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Generate month options (current + last 12 months)
  const monthOptions = useMemo(() => generateMonthOptions(12), []);

  // Filters state
  const [filters, setFilters] = useState<PayoutFilters>(() => {
    const currentMonth =
      monthOptions[0]?.value || new Date().toISOString().slice(0, 7);
    return {
      month: searchParams?.get("month") || currentMonth,
      processor:
        (searchParams?.get("processor") as "stripe" | "gocardless" | "all") ||
        "all",
      status:
        (searchParams?.get("status") as "paid" | "in_transit" | "all") || "all",
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

    if (filters.month) params.set("month", filters.month);
    if (filters.processor) params.set("processor", filters.processor);
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size)
      params.set("page_size", filters.page_size.toString());

    return `/api/reports/payouts?${params.toString()}`;
  }, [filters]);

  // Fetch payout data
  const {
    data: payoutData,
    error: payoutError,
    isLoading,
    mutate,
  } = useSWR<PayoutsResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // 30 seconds cache
    revalidateOnFocus: false,
  });

  // Handle filter changes
  const updateFilters = (newFilters: Partial<PayoutFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
  };

  // Handle month change
  const handleMonthChange = (monthValue: string) => {
    updateFilters({ month: monthValue });
  };

  // Handle processor change
  const handleProcessorChange = (processorValue: string) => {
    updateFilters({
      processor: processorValue as "stripe" | "gocardless" | "all",
    });
  };

  // Handle status change
  const handleStatusChange = (statusValue: string) => {
    updateFilters({ status: statusValue as "paid" | "in_transit" | "all" });
  };

  // Handle view details
  const handleViewDetails = (payoutId: string) => {
    router.push(`/reports/payouts/${payoutId}`);
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
                  Monthly Payouts
                </h1>
                <p className="text-gray-400">
                  Track payouts received from Stripe and GoCardless
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => mutate()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Month Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Month
                  </label>
                  <select
                    value={filters.month || ""}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Processor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Processor
                  </label>
                  <select
                    value={filters.processor || "all"}
                    onChange={(e) => handleProcessorChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {PROCESSOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status || "all"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          {payoutData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Payouts</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(payoutData.data.summary.total_amount)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Stripe</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(payoutData.data.summary.stripe_amount)}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">GoCardless</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(
                        payoutData.data.summary.gocardless_amount,
                      )}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Fees</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(payoutData.data.summary.total_fees)}
                    </p>
                  </div>
                  <X className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading payout data...</p>
              </div>
            ) : payoutError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the payout data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : payoutData?.data?.payouts?.length ? (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Payouts for{" "}
                        {
                          monthOptions.find((m) => m.value === filters.month)
                            ?.label
                        }
                      </h3>
                      <p className="text-sm text-gray-400">
                        {payoutData.data.summary.total_payouts} payout
                        {payoutData.data.summary.total_payouts !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {payoutData.data.pagination && (
                      <div className="text-sm text-gray-400">
                        {(payoutData.data.pagination.page - 1) *
                          payoutData.data.pagination.page_size +
                          1}
                        -
                        {Math.min(
                          payoutData.data.pagination.page *
                            payoutData.data.pagination.page_size,
                          payoutData.data.pagination.total_count,
                        )}{" "}
                        of{" "}
                        {payoutData.data.pagination.total_count.toLocaleString()}
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
                          Date
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Processor
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Amount
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Items
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Fees
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutData.data.payouts.map((payout) => {
                        const statusDisplay = getStatusColor(payout.status);
                        const processorColor = getProcessorColor(
                          payout.processor,
                        );

                        return (
                          <tr
                            key={payout.id}
                            className="border-b border-gray-700 hover:bg-gray-750"
                          >
                            <td className="p-4">
                              <p className="text-white font-medium">
                                {formatDate(payout.payout_date)}
                              </p>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${processorColor}`}
                              >
                                {payout.processor.charAt(0).toUpperCase() +
                                  payout.processor.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {payout.status === "paid" ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-400" />
                                )}
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.text}`}
                                >
                                  {payout.status === "paid"
                                    ? "Paid"
                                    : "In Transit"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-white font-semibold">
                                {formatCurrency(payout.amount)}
                              </p>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <p className="text-white">
                                  {payout.item_count} items
                                </p>
                                <p className="text-gray-400">
                                  {payout.charge_count} charges,{" "}
                                  {payout.refund_count} refunds
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-red-400">
                                {formatCurrency(payout.total_fees)}
                              </p>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleViewDetails(payout.id)}
                                className="flex items-center gap-2 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {payoutData.data.pagination &&
                  payoutData.data.pagination.total_pages > 1 && (
                    <div className="p-6 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Page {payoutData.data.pagination.page} of{" "}
                          {payoutData.data.pagination.total_pages}
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
                              payoutData.data.pagination.total_pages
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
                <Banknote className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Payouts Found
                </h3>
                <p className="text-gray-400 mb-4">
                  No payouts found for the selected month and filters.
                </p>
                <p className="text-sm text-gray-500">
                  Try selecting a different month or adjusting your filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
export default function PayoutsReportPage() {
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
      <PayoutsReportPageContent />
    </Suspense>
  );
}
