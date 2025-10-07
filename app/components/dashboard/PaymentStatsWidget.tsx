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
      // Fetch payment stats from API (queries 'payments' table)
      const response = await fetch("/api/dashboard/payment-stats");

      if (!response.ok) {
        console.error("Error fetching payment stats:", response.status);
        setLoading(false);
        return;
      }

      const { stats: apiStats } = await response.json();

      setStats(apiStats);
    } catch (error) {
      console.error("Error fetching payment stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amountInPounds: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountInPounds);
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
