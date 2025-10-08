"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { RequireOrganization } from "@/app/components/auth/RequireOrganization";
import { useOrganization } from "@/app/hooks/useOrganization";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  Loader2,
  Table as TableIcon,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PeriodData {
  period: string;
  year: number;
  month: number;
  payment_count: number;
  total_revenue: number;
  unique_customers: number;
}

interface CategoryData {
  period: string;
  category: string;
  payment_count: number;
  total_revenue: number;
}

interface AIAnalysis {
  seasonality: string;
  peakPeriods: string[];
  peakReason: string;
  lowPeriods: string[];
  lowReason: string;
  trend: "growing" | "stable" | "declining";
  trendDescription: string;
  recommendations: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  summary: string;
}

interface TurnoverData {
  view: string;
  periods: PeriodData[];
  categoryBreakdown: CategoryData[];
  totalRevenue: number;
  totalPayments: number;
  averageMonthlyRevenue: number;
}

const COLORS = [
  "#F59E0B", // Orange
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Dark Orange
];

function MonthlyTurnoverPageContent() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organizationId } = useOrganization();

  const [data, setData] = useState<TurnoverData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");
  const [timeRange, setTimeRange] = useState<"12" | "24" | "36">("12");

  useEffect(() => {
    if (!organizationId) return;
    fetchTurnoverData();
  }, [organizationId, timeRange]);

  const fetchTurnoverData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/reports/monthly-turnover?months=${timeRange}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch turnover data");
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load turnover data");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!data) return;

    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch("/api/reports/monthly-turnover/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periods: data.periods,
          categoryBreakdown: data.categoryBreakdown,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze data");
      }

      setAnalysis(result.data.analysis);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Failed to analyze turnover data");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getMonthName = (period: string) => {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  };

  // Prepare chart data
  const chartData =
    data?.periods
      .slice()
      .reverse()
      .map((p) => ({
        name: getMonthName(p.period),
        revenue: p.total_revenue,
        payments: p.payment_count,
        customers: p.unique_customers,
      })) || [];

  // Prepare category pie chart data
  const categoryTotals = new Map<string, number>();
  data?.categoryBreakdown?.forEach((item) => {
    categoryTotals.set(
      item.category,
      (categoryTotals.get(item.category) || 0) + item.total_revenue,
    );
  });

  const pieData = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading turnover data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !data) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchTurnoverData}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Monthly Turnover
              </h1>
              <p className="text-gray-400">
                Revenue analysis with AI-powered insights
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) =>
                  setTimeRange(e.target.value as "12" | "24" | "36")
                }
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="12">Last 12 Months</option>
                <option value="24">Last 24 Months</option>
                <option value="36">Last 36 Months</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("graph")}
                  className={`px-3 py-2 rounded transition-all ${
                    viewMode === "graph"
                      ? "bg-orange-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 rounded transition-all ${
                    viewMode === "table"
                      ? "bg-orange-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                </button>
              </div>

              {/* AI Analysis Button */}
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !data}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI Insights
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Revenue</span>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(data?.totalRevenue || 0)}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg Monthly</span>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(data?.averageMonthlyRevenue || 0)}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Payments</span>
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {data?.totalPayments?.toLocaleString() || 0}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg per Payment</span>
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(
                  (data?.totalRevenue || 0) / (data?.totalPayments || 1),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        {analysis && (
          <div className="mb-8 bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-700/50 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">
                  AI-Powered Insights
                </h2>
                <p className="text-gray-300 mb-6">{analysis.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Seasonality */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Seasonality
                    </h3>
                    <p className="text-sm text-gray-300">
                      {analysis.seasonality}
                    </p>
                  </div>

                  {/* Trend */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      {analysis.trend === "growing" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : analysis.trend === "declining" ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <BarChart3 className="h-4 w-4 text-yellow-500" />
                      )}
                      Growth Trend
                    </h3>
                    <p className="text-sm text-gray-300">
                      {analysis.trendDescription}
                    </p>
                  </div>
                </div>

                {/* Peak and Low Periods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-400 mb-2">
                      Peak Periods
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {analysis.peakPeriods.map((period) => (
                        <span
                          key={period}
                          className="px-2 py-1 bg-green-700/30 text-green-300 rounded text-sm"
                        >
                          {period}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-300">
                      {analysis.peakReason}
                    </p>
                  </div>

                  <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-400 mb-2">
                      Low Periods
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {analysis.lowPeriods.map((period) => (
                        <span
                          key={period}
                          className="px-2 py-1 bg-red-700/30 text-red-300 rounded text-sm"
                        >
                          {period}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-300">
                      {analysis.lowReason}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="font-semibold text-white mb-3">
                    Actionable Recommendations
                  </h3>
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">
                            {rec.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              rec.impact === "high"
                                ? "bg-green-700/30 text-green-300"
                                : rec.impact === "medium"
                                  ? "bg-yellow-700/30 text-yellow-300"
                                  : "bg-gray-700/30 text-gray-300"
                            }`}
                          >
                            {rec.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {rec.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === "graph" ? (
          <div className="space-y-6">
            {/* Revenue Line Chart */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Monthly Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#F9FAFB" }}
                    formatter={(value: any, name: string) => {
                      if (name === "revenue")
                        return [formatCurrency(value), "Revenue"];
                      if (name === "payments")
                        return [value.toLocaleString(), "Payments"];
                      if (name === "customers")
                        return [value.toLocaleString(), "Customers"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: "#F59E0B" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Payments and Customers Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Payments per Month
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="payments" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Unique Customers per Month
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="customers" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            {pieData.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Revenue by Category
                </h3>
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) =>
                          `${entry.name}: ${formatCurrency(entry.value)}`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex-1 w-full">
                    <div className="space-y-3">
                      {pieData.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-white">
                              {formatCurrency(item.value)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {(
                                (item.value / (data?.totalRevenue || 1)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payments
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Avg/Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data?.periods.map((period) => (
                    <tr key={period.period} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {getMonthName(period.period)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-white">
                        {formatCurrency(period.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                        {period.payment_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                        {period.unique_customers.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-300">
                        {formatCurrency(
                          period.total_revenue / period.payment_count,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-900 border-t border-gray-700">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-white">
                      {formatCurrency(data?.totalRevenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-white">
                      {data?.totalPayments.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-white">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-white">
                      {formatCurrency(
                        (data?.totalRevenue || 0) / (data?.totalPayments || 1),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MonthlyTurnoverPage() {
  return (
    <RequireOrganization>
      <MonthlyTurnoverPageContent />
    </RequireOrganization>
  );
}
