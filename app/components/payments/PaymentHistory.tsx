"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { CreditCard, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  status?: string;
  description?: string;
  currency?: string;
}

interface PaymentHistoryProps {
  clientId: string;
  clientName?: string;
}

export function PaymentHistory({ clientId, clientName }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchPayments();
    }
  }, [clientId]);

  const fetchPayments = async () => {
    try {
      const supabase = createClient();

      // Fetch payment records from both transactions and payments tables
      const [transactionsResult, paymentsResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("client_id", clientId)
          .eq("type", "payment")
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("client_id", clientId)
          .order("payment_date", { ascending: false }),
      ]);

      if (transactionsResult.error) {
        console.error("Error fetching transactions:", transactionsResult.error);
      }

      if (paymentsResult.error) {
        console.error("Error fetching payments:", paymentsResult.error);
      }

      // Combine and format payments from both sources
      const allPayments: PaymentRecord[] = [];

      // Add transactions
      if (transactionsResult.data) {
        allPayments.push(...transactionsResult.data);
      }

      // Add imported payments (format them to match PaymentRecord structure)
      if (paymentsResult.data) {
        paymentsResult.data.forEach((payment) => {
          allPayments.push({
            id: payment.id,
            amount: payment.amount,
            type: "payment",
            created_at: payment.payment_date || payment.created_at,
            status: payment.payment_status || "completed",
            description:
              payment.description || `Payment via ${payment.payment_method}`,
            currency: payment.currency || "GBP",
          });
        });
      }

      // Sort by date (newest first)
      allPayments.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setPayments(allPayments);
      setTotalPayments(allPayments.length);

      // Calculate total amount
      const total =
        allPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) ||
        0;
      setTotalAmount(total);

      // Calculate current month total
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthTotal =
        allPayments?.reduce((sum, payment) => {
          const date = new Date(payment.created_at);
          if (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          ) {
            return sum + (payment.amount || 0);
          }
          return sum;
        }, 0) || 0;
      setCurrentMonthTotal(monthTotal);

      // Get last payment date
      if (allPayments && allPayments.length > 0) {
        setLastPayment(allPayments[0].created_at);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amountInPennies: number) => {
    // Convert from pennies to pounds
    const pounds = amountInPennies / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(pounds);
  };

  const getDaysSinceLastPayment = () => {
    if (!lastPayment) return null;
    const last = new Date(lastPayment);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPaymentStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-700";
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const displayedPayments = showAll ? payments : payments.slice(0, 10);
  const daysSinceLastPayment = getDaysSinceLastPayment();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Payment History
          </h3>
          <span className="text-sm text-gray-500">
            {clientName || "Client"}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Paid</p>
                <p className="text-xl font-bold text-green-900">
                  {formatAmount(totalAmount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Payments</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalPayments}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">
                  This Month
                </p>
                <p className="text-xl font-bold text-purple-900">
                  {formatAmount(currentMonthTotal)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">
                  Last Payment
                </p>
                <p className="text-lg font-bold text-orange-900">
                  {daysSinceLastPayment !== null
                    ? `${daysSinceLastPayment} day${daysSinceLastPayment !== 1 ? "s" : ""} ago`
                    : "Never"}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="p-6">
        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No payment records found</p>
            <p className="text-sm mt-1">Import payment data to see history</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedPayments.map((payment) => {
                const isImported =
                  payment.created_at && !payment.transaction_date;

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatAmount(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                          {payment.description &&
                            ` • ${payment.description.substring(0, 50)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isImported && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          Imported
                        </span>
                      )}
                      {payment.status && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {payments.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showAll
                    ? "Show Less"
                    : `Show All (${payments.length} records)`}
                </button>
              </div>
            )}

            {/* Average payment */}
            {totalPayments > 0 && (
              <div className="mt-6 pt-4 border-t text-center text-sm text-gray-600">
                Average payment:{" "}
                <span className="font-semibold">
                  {formatAmount(totalAmount / totalPayments)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
