"use client";

import { useEffect, useState } from "react";

interface PaymentsTabProps {
  organizationId: string;
}

export default function PaymentsTab({ organizationId }: PaymentsTabProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<any>(null);
  const [recentCharges, setRecentCharges] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentData();
  }, [organizationId]);

  const fetchPaymentData = async () => {
    try {
      const res = await fetch(
        `/api/admin/organizations/${organizationId}/payments`,
      );
      if (res.ok) {
        const data = await res.json();
        setConnectedAccounts(data.connectedAccounts);
        setRecentCharges(data.recentCharges || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Revenue (30d)</p>
            <p className="text-2xl font-bold">
              £{stats.revenue30d?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Platform Fees (30d)</p>
            <p className="text-2xl font-bold">
              £{stats.fees30d?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.totalTransactions || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-2xl font-bold">{stats.successRate || 0}%</p>
          </div>
        </div>
      )}

      {/* Connected Accounts */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Payment Processors
        </h3>

        <div className="space-y-3">
          {/* Stripe Connect */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Stripe Connect</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {connectedAccounts?.stripe_account_id ? (
                    <>
                      Account: {connectedAccounts.stripe_account_id}
                      {connectedAccounts.stripe_charges_enabled && (
                        <span className="ml-2 text-green-600">
                          ✓ Charges enabled
                        </span>
                      )}
                    </>
                  ) : (
                    "Not connected"
                  )}
                </p>
              </div>
              {connectedAccounts?.stripe_account_id && (
                <a
                  href={`https://dashboard.stripe.com/connect/accounts/${connectedAccounts.stripe_account_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View in Stripe →
                </a>
              )}
            </div>
          </div>

          {/* GoCardless */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">GoCardless</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {connectedAccounts?.gc_organization_id ? (
                    <>Organization: {connectedAccounts.gc_organization_id}</>
                  ) : (
                    "Not connected"
                  )}
                </p>
              </div>
              {connectedAccounts?.gc_organization_id && (
                <a
                  href={`https://manage.gocardless.com/organisations/${connectedAccounts.gc_organization_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View in GoCardless →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Charges */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recent Gym Charges
        </h3>

        {recentCharges.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fee
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Processor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCharges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-4 py-2 text-sm">
                      {new Date(charge.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {charge.client_name || "Unknown"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      £{(charge.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      £{(charge.platform_fee_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm capitalize">
                      {charge.processor}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full
                        ${charge.status === "succeeded" ? "bg-green-100 text-green-800" : ""}
                        ${charge.status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
                        ${charge.status === "failed" ? "bg-red-100 text-red-800" : ""}
                        ${charge.status === "refunded" ? "bg-gray-100 text-gray-800" : ""}
                      `}
                      >
                        {charge.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-center text-gray-500">
            No charges found
          </div>
        )}
      </div>
    </div>
  );
}
