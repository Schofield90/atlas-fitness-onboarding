"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  ArrowLeft,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Building2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
} from "lucide-react";
import {
  PayoutDetailsResponse,
  formatCurrency,
  formatDate,
  formatDateTime,
  getProcessorColor,
  getStatusColor,
} from "@/app/types/payouts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PayoutDetailsPageProps {
  params: { id: string };
}

export default function PayoutDetailsPage({ params }: PayoutDetailsPageProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch payout details
  const {
    data: payoutData,
    error: payoutError,
    isLoading,
    mutate,
  } = useSWR<PayoutDetailsResponse>(
    `/api/reports/payouts/${params.id}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds cache
      revalidateOnFocus: false,
    },
  );

  // Handle CSV download
  const handleDownloadCSV = async () => {
    setExportLoading(true);
    try {
      const response = await fetch(`/api/reports/payouts/${params.id}/export`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch
          ? filenameMatch[1]
          : `payout-${params.id}-${new Date().toISOString().split("T")[0]}.csv`;

        a.download = filename;
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading payout details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (payoutError || !payoutData?.success) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Failed to Load Payout
              </h3>
              <p className="text-gray-400 mb-4">
                {payoutError?.message ||
                  "There was an error loading the payout details."}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push("/reports/payouts")}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Back to Payouts
                </button>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { header, items, totals } = payoutData.data;
  const processorColor = getProcessorColor(header.processor);
  const statusDisplay = getStatusColor(header.status);
  const processorName =
    header.processor.charAt(0).toUpperCase() + header.processor.slice(1);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.push("/reports/payouts")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Payouts
              </button>

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

                <button
                  onClick={handleDownloadCSV}
                  disabled={exportLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {exportLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download CSV
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {header.processor === "stripe" ? (
                  <CreditCard className="h-8 w-8 text-blue-500" />
                ) : (
                  <Building2 className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {processorName} Payout for {formatCurrency(header.amount)}
                  </h1>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-gray-400">
                      Arrival date: {formatDate(header.payout_date)}
                    </p>
                    <div className="flex items-center gap-2">
                      {header.status === "paid" ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-400" />
                      )}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.text}`}
                      >
                        {header.status === "paid" ? "Paid" : "In Transit"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-white">
                    {header.item_count}
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Charges</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(totals.charges_amount)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Refunds</p>
                  <p className="text-2xl font-bold text-red-400">
                    -{formatCurrency(totals.refunds_amount)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Processing Fees</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {formatCurrency(totals.total_fees)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Payout Items ({items.length})
              </h3>
              <p className="text-sm text-gray-400">
                Detailed breakdown of charges and refunds included in this
                payout
              </p>
            </div>

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Date
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Type
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Customer
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Item
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Amount
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Fees
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-300">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const netAmount = item.amount - item.fee;
                      const isRefund = item.type === "refund";

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-700 hover:bg-gray-750"
                        >
                          <td className="p-4">
                            <div>
                              <p className="text-white text-sm">
                                {formatDate(item.occurred_date)}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {formatDateTime(item.occurred_at).split(" ")[1]}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {isRefund ? (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                              )}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isRefund
                                    ? "bg-red-900 text-red-400"
                                    : "bg-green-900 text-green-400"
                                }`}
                              >
                                {isRefund ? "Refund" : "Charge"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-white font-medium">
                                {item.customer_name}
                              </p>
                              {item.customer_email && (
                                <p className="text-gray-400 text-sm">
                                  {item.customer_email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-white">{item.item}</p>
                          </td>
                          <td className="p-4">
                            <p
                              className={`font-semibold ${isRefund ? "text-red-400" : "text-green-400"}`}
                            >
                              {isRefund ? "-" : ""}
                              {formatCurrency(Math.abs(item.amount))}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-orange-400">
                              {formatCurrency(item.fee)}
                            </p>
                          </td>
                          <td className="p-4">
                            <p
                              className={`font-semibold ${netAmount < 0 ? "text-red-400" : "text-white"}`}
                            >
                              {formatCurrency(netAmount)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Items Found
                </h3>
                <p className="text-gray-400">
                  This payout doesn't contain any detailed items.
                </p>
              </div>
            )}

            {/* Summary Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-gray-700 bg-gray-750">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Total Charges</p>
                    <p className="text-lg font-bold text-green-400">
                      {formatCurrency(totals.charges_amount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Total Refunds</p>
                    <p className="text-lg font-bold text-red-400">
                      -{formatCurrency(totals.refunds_amount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Processing Fees</p>
                    <p className="text-lg font-bold text-orange-400">
                      {formatCurrency(totals.total_fees)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Net Payout</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(totals.net_amount)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
