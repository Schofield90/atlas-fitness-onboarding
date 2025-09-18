"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Receipt,
  Download,
  Filter,
  Search,
  X,
  RefreshCw,
  BarChart3,
  FileText,
  Calendar,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Package,
  DollarSign,
} from "lucide-react";
import {
  InvoiceItemTab,
  InvoiceItemFilters,
  InvoiceItemLineResponse,
  InvoiceItemSummaryResponse,
  InvoiceItemTransactionResponse,
  MonthOption,
  PROCESSOR_OPTIONS,
  DATE_TYPE_OPTIONS,
} from "@/app/types/invoice-items";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Generate month options for the last 12 months
function generateMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = date.toISOString().slice(0, 7); // YYYY-MM
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    options.push({ value, label });
  }

  return options;
}

function InvoiceItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Get current month as default
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthOptions = generateMonthOptions();

  // Filters state
  const [filters, setFilters] = useState<InvoiceItemFilters>(() => ({
    month: searchParams?.get("month") || currentMonth,
    date_type:
      (searchParams?.get("date_type") as "confirmed" | "due") || "confirmed",
    processor: searchParams?.getAll("processor") || [],
    page: parseInt(searchParams?.get("page") || "1"),
    page_size: parseInt(searchParams?.get("page_size") || "50"),
  }));

  // Tab state
  const [activeTab, setActiveTab] = useState<InvoiceItemTab>(() => {
    const tab = searchParams?.get("tab") as InvoiceItemTab;
    return tab && ["transactions", "item-summary", "line-items"].includes(tab)
      ? tab
      : "transactions";
  });

  // Build API URLs based on active tab and filters
  const apiUrls = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.month) params.set("month", filters.month);
    if (filters.date_type) params.set("date_type", filters.date_type);
    filters.processor?.forEach((p) => params.append("processor", p));
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.page_size)
      params.set("page_size", filters.page_size.toString());

    const baseParams = params.toString();

    return {
      "line-items": `/api/reports/invoice-items/line-items?${baseParams}`,
      "item-summary": `/api/reports/invoice-items/item-summary?${baseParams}`,
      transactions: `/api/reports/invoice-items/transactions?${baseParams}`,
    };
  }, [filters]);

  // Fetch data based on active tab
  const { data, error, isLoading, mutate } = useSWR(
    apiUrls[activeTab],
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
    },
  );

  // Handle filter changes
  const updateFilters = (newFilters: Partial<InvoiceItemFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change

    // Update URL params
    const params = new URLSearchParams();
    const updatedFilters = { ...filters, ...newFilters };

    if (updatedFilters.month) params.set("month", updatedFilters.month);
    if (updatedFilters.date_type)
      params.set("date_type", updatedFilters.date_type);
    updatedFilters.processor?.forEach((p) => params.append("processor", p));
    params.set("tab", activeTab);

    router.push(`/reports/invoice-items?${params.toString()}`, {
      scroll: false,
    });
  };

  // Handle tab change
  const handleTabChange = (tab: InvoiceItemTab) => {
    setActiveTab(tab);

    const params = new URLSearchParams();
    if (filters.month) params.set("month", filters.month);
    if (filters.date_type) params.set("date_type", filters.date_type);
    filters.processor?.forEach((p) => params.append("processor", p));
    params.set("tab", tab);

    router.push(`/reports/invoice-items?${params.toString()}`, {
      scroll: false,
    });
  };

  // Handle CSV export
  const handleExport = async (tabToExport: InvoiceItemTab = activeTab) => {
    setExportLoading(tabToExport);
    try {
      const params = new URLSearchParams();

      if (filters.month) params.set("month", filters.month);
      if (filters.date_type) params.set("date_type", filters.date_type);
      filters.processor?.forEach((p) => params.append("processor", p));
      params.set("format", "csv");

      const response = await fetch(
        `/api/reports/invoice-items/${tabToExport}?${params.toString()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-items-${tabToExport}-${filters.month}.csv`;
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
      setExportLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get the selected month label
  const selectedMonthLabel =
    monthOptions.find((m) => m.value === filters.month)?.label || filters.month;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Invoice Items
                </h1>
                <p className="text-gray-400">
                  Detailed analysis of invoice line items, transactions, and
                  summaries
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExport()}
                  disabled={exportLoading === activeTab || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {exportLoading === activeTab ? (
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
              <button
                onClick={() => handleTabChange("transactions")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "transactions"
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Transactions
              </button>
              <button
                onClick={() => handleTabChange("item-summary")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "item-summary"
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <Package className="h-4 w-4" />
                Item Summary
              </button>
              <button
                onClick={() => handleTabChange("line-items")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "line-items"
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <FileText className="h-4 w-4" />
                Line Items
              </button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Month Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Month
                  </label>
                  <div className="relative">
                    <select
                      value={filters.month || ""}
                      onChange={(e) => updateFilters({ month: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Type
                  </label>
                  <div className="relative">
                    <select
                      value={filters.date_type || "confirmed"}
                      onChange={(e) =>
                        updateFilters({
                          date_type: e.target.value as "confirmed" | "due",
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer"
                    >
                      {DATE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Processor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Processor
                  </label>
                  <div className="space-y-2">
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

          {/* Results */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">
                  Loading {activeTab.replace("-", " ")} data...
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Failed to Load Data
                </h3>
                <p className="text-gray-400 mb-4">
                  There was an error loading the {activeTab.replace("-", " ")}{" "}
                  data.
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div>
                {/* Results Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {activeTab.replace("-", " ")} for {selectedMonthLabel}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {filters.date_type === "due"
                          ? "Due dates"
                          : "Confirmed dates"}
                        {filters.processor && filters.processor.length > 0 && (
                          <span> • {filters.processor.join(", ")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tab-specific content */}
                {activeTab === "transactions" && data?.data && (
                  <TransactionsTab
                    data={data as InvoiceItemTransactionResponse}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                )}

                {activeTab === "item-summary" && data?.data && (
                  <ItemSummaryTab
                    data={data as InvoiceItemSummaryResponse}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activeTab === "line-items" && data?.data && (
                  <LineItemsTab
                    data={data as InvoiceItemLineResponse}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    filters={filters}
                    updateFilters={updateFilters}
                  />
                )}

                {/* No Data State */}
                {data?.data &&
                  ((activeTab === "transactions" &&
                    data.data.transactions?.length === 0) ||
                    (activeTab === "item-summary" &&
                      data.data.items?.length === 0) ||
                    (activeTab === "line-items" &&
                      data.data.line_items?.length === 0)) && (
                    <div className="p-8 text-center">
                      <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">
                        No Data Found
                      </h3>
                      <p className="text-gray-400 mb-4">
                        No {activeTab.replace("-", " ")} found for the selected
                        filters and date range.
                      </p>
                      <p className="text-sm text-gray-500">
                        Try adjusting your filters or selecting a different
                        month.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Transaction Tab Component
function TransactionsTab({
  data,
  formatCurrency,
  formatDate,
}: {
  data: InvoiceItemTransactionResponse;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  return (
    <div>
      {/* Summary Cards */}
      {data.data.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-gray-700">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.data.totals.total_amount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {data.data.totals.total_count.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
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
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Amount
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {data.data.transactions.map((transaction, index) => (
              <tr
                key={`${transaction.date}-${transaction.processor}`}
                className="border-b border-gray-700 hover:bg-gray-750"
              >
                <td className="p-4 text-white">
                  {formatDate(transaction.date)}
                </td>
                <td className="p-4 text-white capitalize">
                  {transaction.processor}
                </td>
                <td className="p-4 text-white text-right font-semibold">
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="p-4 text-white text-right">
                  {transaction.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Item Summary Tab Component
function ItemSummaryTab({
  data,
  formatCurrency,
}: {
  data: InvoiceItemSummaryResponse;
  formatCurrency: (amount: number) => string;
}) {
  // Group items by type for better organization
  const paymentItems = data.data.items.filter((item) =>
    ["membership", "class", "course", "store"].includes(item.item_type),
  );

  return (
    <div>
      {/* Summary Cards */}
      {data.data.totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-gray-700">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Payments Total</p>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(data.data.totals.payments_total)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Taxes Total</p>
                <p className="text-xl font-bold text-yellow-500">
                  {formatCurrency(data.data.totals.taxes_total)}
                </p>
              </div>
              <Receipt className="h-6 w-6 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Discounts Total</p>
                <p className="text-xl font-bold text-orange-500">
                  {formatCurrency(data.data.totals.discounts_total)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Items</p>
                <p className="text-xl font-bold text-white">
                  {data.data.totals.total_count.toLocaleString()}
                </p>
              </div>
              <Package className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Item Type
              </th>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Item Name
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Payments
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Taxes
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Discounts
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {data.data.items.map((item, index) => (
              <tr
                key={`${item.item_type}-${item.item_name}`}
                className="border-b border-gray-700 hover:bg-gray-750"
              >
                <td className="p-4 text-white capitalize">{item.item_type}</td>
                <td className="p-4 text-white">{item.item_name}</td>
                <td className="p-4 text-white text-right font-semibold">
                  {formatCurrency(item.payments_total)}
                </td>
                <td className="p-4 text-white text-right">
                  {formatCurrency(item.taxes_total)}
                </td>
                <td className="p-4 text-white text-right">
                  {formatCurrency(item.discounts_total)}
                </td>
                <td className="p-4 text-white text-right">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Line Items Tab Component
function LineItemsTab({
  data,
  formatCurrency,
  formatDate,
  filters,
  updateFilters,
}: {
  data: InvoiceItemLineResponse;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  filters: InvoiceItemFilters;
  updateFilters: (filters: Partial<InvoiceItemFilters>) => void;
}) {
  return (
    <div>
      {/* Summary Cards */}
      {data.data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-gray-700">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(data.data.summary.total_amount)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tax</p>
                <p className="text-xl font-bold text-yellow-500">
                  {formatCurrency(data.data.summary.total_tax)}
                </p>
              </div>
              <Receipt className="h-6 w-6 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Discount</p>
                <p className="text-xl font-bold text-orange-500">
                  {formatCurrency(data.data.summary.total_discount)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Items</p>
                <p className="text-xl font-bold text-white">
                  {data.data.summary.total_count.toLocaleString()}
                </p>
              </div>
              <Package className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Date
              </th>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Customer
              </th>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Item Type
              </th>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Item Name
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Qty
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Unit Price
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Tax
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Discount
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-300">
                Total
              </th>
              <th className="text-left p-4 text-sm font-medium text-gray-300">
                Processor
              </th>
            </tr>
          </thead>
          <tbody>
            {data.data.line_items.map((item, index) => (
              <tr
                key={`${item.invoice_id}-${index}`}
                className="border-b border-gray-700 hover:bg-gray-750"
              >
                <td className="p-4 text-white">{formatDate(item.date)}</td>
                <td className="p-4 text-white">{item.customer}</td>
                <td className="p-4 text-white capitalize">{item.item_type}</td>
                <td className="p-4 text-white">{item.item_name}</td>
                <td className="p-4 text-white text-right">{item.qty}</td>
                <td className="p-4 text-white text-right">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="p-4 text-white text-right">
                  {formatCurrency(item.tax)}
                </td>
                <td className="p-4 text-white text-right">
                  {formatCurrency(item.discount)}
                </td>
                <td className="p-4 text-white text-right font-semibold">
                  {formatCurrency(item.total)}
                </td>
                <td className="p-4 text-white capitalize">{item.processor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.data.pagination && data.data.pagination.total_pages > 1 && (
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {data.data.pagination.page} of{" "}
              {data.data.pagination.total_pages}
              <span className="ml-2">
                (
                {(data.data.pagination.page - 1) *
                  data.data.pagination.page_size +
                  1}
                -
                {Math.min(
                  data.data.pagination.page * data.data.pagination.page_size,
                  data.data.pagination.total_count,
                )}{" "}
                of {data.data.pagination.total_count.toLocaleString()})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })
                }
                disabled={(filters.page || 1) <= 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-3 py-1 text-white">{filters.page || 1}</span>

              <button
                onClick={() => updateFilters({ page: (filters.page || 1) + 1 })}
                disabled={
                  (filters.page || 1) >= data.data.pagination.total_pages
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
  );
}

export default function InvoiceItemsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-6">
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <InvoiceItemsContent />
    </Suspense>
  );
}
