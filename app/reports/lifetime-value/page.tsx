"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  DollarSign,
  Users,
  TrendingUp,
  Trophy,
  Medal,
  Award,
  Search,
  Download,
  Calendar,
  CreditCard,
} from "lucide-react";

interface Client {
  clientId: string;
  name: string;
  email: string;
  status: string;
  totalPaid: number;
  paymentCount: number;
  firstPayment: string;
  lastPayment: string;
  averagePayment: number;
  providers: string[];
}

interface LTVData {
  clients: Client[];
  topClients: Client[];
  metrics: {
    totalClients: number;
    totalRevenue: number;
    averageLTV: number;
    totalPayments: number;
    averagePaymentCount: number;
  };
}

export default function LifetimeValueReport() {
  const [data, setData] = useState<LTVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLTVData();
  }, []);

  const fetchLTVData = async () => {
    try {
      const response = await fetch("/api/reports/lifetime-value");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Error fetching LTV data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="h-6 w-6 text-yellow-500" title="1st Place" />;
    if (rank === 2)
      return <Medal className="h-6 w-6 text-gray-400" title="2nd Place" />;
    if (rank === 3)
      return <Medal className="h-6 w-6 text-amber-600" title="3rd Place" />;
    return <Award className="h-5 w-5 text-gray-500" />;
  };

  const filteredClients = data?.clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-400">Failed to load LTV data</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Client Lifetime Value</h1>
          <p className="text-gray-400">
            Track total revenue per client and identify your top customers
          </p>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">
              {data.metrics.totalClients.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">Total Clients</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(data.metrics.averageLTV)}
            </p>
            <p className="text-sm text-gray-400">Average LTV</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(data.metrics.totalRevenue)}
            </p>
            <p className="text-sm text-gray-400">Total Revenue</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">
              {data.metrics.averagePaymentCount.toFixed(1)}
            </p>
            <p className="text-sm text-gray-400">Avg Payments/Client</p>
          </div>
        </div>

        {/* Top 10 Leaderboard */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Top 10 Clients by Lifetime Value
            </h2>
          </div>

          <div className="space-y-3">
            {data.topClients.map((client, index) => {
              const rank = index + 1;
              const percentage =
                (client.totalPaid / data.metrics.totalRevenue) * 100;

              return (
                <div
                  key={client.clientId}
                  className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(rank)}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-white">{client.name}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          client.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{client.email}</p>
                  </div>

                  {/* Payment Stats */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(client.totalPaid)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {client.paymentCount} payments •{" "}
                      {formatCurrency(client.averagePayment)} avg
                    </p>
                  </div>

                  {/* Percentage Bar */}
                  <div className="w-32">
                    <div className="w-full bg-gray-600 rounded-full h-2 mb-1">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      {percentage.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* All Clients Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">All Clients</h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Lifetime Value
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Payments
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                    Avg Payment
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    First Payment
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                    Last Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients?.map((client, index) => (
                  <tr
                    key={client.clientId}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-300">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">{client.name}</p>
                        <p className="text-sm text-gray-400">{client.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          client.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-500">
                      {formatCurrency(client.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {client.paymentCount}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {formatCurrency(client.averagePayment)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {formatDate(client.firstPayment)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {formatDate(client.lastPayment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClients?.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No clients found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
