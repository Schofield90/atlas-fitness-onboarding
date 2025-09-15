"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { DollarSign, TrendingUp, CreditCard, Calendar } from "lucide-react";

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  topPayers: { name: string; total: number }[];
  averagePayment: number;
}

export function PaymentStatsWidget() {
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    topPayers: [],
    averagePayment: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentStats();
  }, []);

  const fetchPaymentStats = async () => {
    try {
      const supabase = createClient();

      // Get all payment transactions
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          client_id,
          amount,
          type,
          created_at,
          clients!transactions_client_id_fkey(name)
        `,
        )
        .eq("type", "payment");

      if (error) {
        console.error("Error fetching payment stats:", error);
        setLoading(false);
        return;
      }

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      let todayTotal = 0;
      let weekTotal = 0;
      let monthTotal = 0;
      let totalRevenue = 0;
      const clientPayments: Record<string, { name: string; total: number }> =
        {};

      transactions?.forEach((transaction) => {
        const amount = transaction.amount || 0;
        const transactionDate = new Date(transaction.created_at);
        totalRevenue += amount;

        // Calculate by time period
        if (transactionDate >= today) {
          todayTotal += amount;
        }
        if (transactionDate >= weekAgo) {
          weekTotal += amount;
        }
        if (transactionDate >= monthAgo) {
          monthTotal += amount;
        }

        // Track payments per client
        if (transaction.client_id) {
          const clientName = transaction.clients?.name || "Unknown";
          if (!clientPayments[transaction.client_id]) {
            clientPayments[transaction.client_id] = {
              name: clientName,
              total: 0,
            };
          }
          clientPayments[transaction.client_id].total += amount;
        }
      });

      // Get top 5 payers
      const topPayers = Object.values(clientPayments)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const totalTransactions = transactions?.length || 0;
      const averagePayment =
        totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      setStats({
        totalRevenue,
        totalTransactions,
        todayRevenue: todayTotal,
        weeklyRevenue: weekTotal,
        monthlyRevenue: monthTotal,
        topPayers,
        averagePayment,
      });
    } catch (error) {
      console.error("Error fetching payment stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amountInPennies: number) => {
    const pounds = amountInPennies / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(pounds);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-700 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-500" />
          Revenue Overview
        </h2>
        <span className="text-sm text-gray-400">
          {stats.totalTransactions} transactions
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatAmount(stats.totalRevenue)}
          </p>
          <p className="text-xs text-gray-500">All time</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Today</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatAmount(stats.todayRevenue)}
          </p>
          <p className="text-xs text-gray-500">Revenue</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">This Week</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatAmount(stats.weeklyRevenue)}
          </p>
          <p className="text-xs text-gray-500">7 days</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">This Month</span>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatAmount(stats.monthlyRevenue)}
          </p>
          <p className="text-xs text-gray-500">30 days</p>
        </div>
      </div>

      {/* Top Payers */}
      {stats.topPayers.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Top Customers by Revenue
          </h3>
          <div className="space-y-2">
            {stats.topPayers.map((payer, index) => {
              const percentage = (payer.total / stats.totalRevenue) * 100;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-white">{payer.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-green-500 font-medium w-20 text-right">
                      {formatAmount(payer.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Average Payment */}
          <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <span className="text-sm text-gray-400">Average payment: </span>
            <span className="text-sm font-semibold text-white">
              {formatAmount(stats.averagePayment)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
