"use client";

import { useEffect, useState } from "react";

interface ProcessorStats {
  stripe: {
    connected: number;
    volume30d: number;
    fees30d: number;
    successRate: number;
  };
  gocardless: {
    connected: number;
    volume30d: number;
    fees30d: number;
    successRate: number;
  };
}

export default function PaymentProcessorStats() {
  const [stats, setStats] = useState<ProcessorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProcessorStats();
  }, []);

  const fetchProcessorStats = async () => {
    try {
      const res = await fetch("/api/admin/billing/processor-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch processor stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Payment Processor Performance
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe Stats */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Stripe Connect</h4>
            <span className="text-sm text-gray-500">
              {stats?.stripe.connected || 0} connected
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Volume (30d)</span>
              <span className="text-sm font-medium">
                £{(stats?.stripe.volume30d || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Platform Fees (30d)</span>
              <span className="text-sm font-medium">
                £{(stats?.stripe.fees30d || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Success Rate</span>
              <span
                className={`text-sm font-medium ${
                  (stats?.stripe.successRate || 0) >= 95
                    ? "text-green-600"
                    : (stats?.stripe.successRate || 0) >= 90
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {stats?.stripe.successRate || 0}%
              </span>
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Avg Transaction</span>
                <span className="text-sm font-medium">
                  £
                  {stats?.stripe.connected
                    ? Math.round(
                        stats.stripe.volume30d / stats.stripe.connected,
                      )
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GoCardless Stats */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">GoCardless</h4>
            <span className="text-sm text-gray-500">
              {stats?.gocardless.connected || 0} connected
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Volume (30d)</span>
              <span className="text-sm font-medium">
                £{(stats?.gocardless.volume30d || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Platform Fees (30d)</span>
              <span className="text-sm font-medium">
                £{(stats?.gocardless.fees30d || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Success Rate</span>
              <span
                className={`text-sm font-medium ${
                  (stats?.gocardless.successRate || 0) >= 95
                    ? "text-green-600"
                    : (stats?.gocardless.successRate || 0) >= 90
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {stats?.gocardless.successRate || 0}%
              </span>
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Avg Transaction</span>
                <span className="text-sm font-medium">
                  £
                  {stats?.gocardless.connected
                    ? Math.round(
                        stats.gocardless.volume30d / stats.gocardless.connected,
                      )
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Metrics */}
      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              £
              {(
                (stats?.stripe.volume30d || 0) +
                (stats?.gocardless.volume30d || 0)
              ).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Volume (30d)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              £
              {(
                (stats?.stripe.fees30d || 0) + (stats?.gocardless.fees30d || 0)
              ).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Platform Fees (30d)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {(stats?.stripe.connected || 0) +
                (stats?.gocardless.connected || 0)}
            </p>
            <p className="text-sm text-gray-500">Total Connected Accounts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
