"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
}

interface AdPerformanceChartProps {
  accountId: string;
  days: number;
}

export function AdPerformanceChart({
  accountId,
  days,
}: AdPerformanceChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState({
    spend: true,
    impressions: false,
    clicks: true,
    leads: true,
    ctr: false,
  });

  useEffect(() => {
    if (accountId) {
      fetchChartData();
    }
  }, [accountId, days]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ads/chart-data?account_id=${accountId}&days=${days}`,
      );
      if (response.ok) {
        const chartData = await response.json();
        setData(chartData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between space-x-4"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-300 text-sm capitalize">
                  {entry.dataKey === "ctr" ? "CTR" : entry.dataKey}:
                </span>
              </div>
              <span className="text-white font-medium">
                {entry.dataKey === "spend"
                  ? formatCurrency(entry.value)
                  : entry.dataKey === "ctr"
                    ? formatPercentage(entry.value)
                    : formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const toggleMetric = (metric: keyof typeof selectedMetrics) => {
    setSelectedMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No data available</div>
          <div className="text-sm">
            No performance data found for the selected time period.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric Toggles */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(selectedMetrics).map(([metric, isSelected]) => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric as keyof typeof selectedMetrics)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {metric === "ctr"
              ? "CTR"
              : metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />

            {selectedMetrics.spend && (
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Spend ($)"
              />
            )}

            {selectedMetrics.impressions && (
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Impressions"
              />
            )}

            {selectedMetrics.clicks && (
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Clicks"
              />
            )}

            {selectedMetrics.leads && (
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Leads"
              />
            )}

            {selectedMetrics.ctr && (
              <Line
                type="monotone"
                dataKey="ctr"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="CTR (%)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-700">
        {selectedMetrics.spend && (
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(data.reduce((sum, d) => sum + d.spend, 0))}
            </div>
            <div className="text-xs text-gray-400">Total Spend</div>
          </div>
        )}

        {selectedMetrics.impressions && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {formatNumber(data.reduce((sum, d) => sum + d.impressions, 0))}
            </div>
            <div className="text-xs text-gray-400">Total Impressions</div>
          </div>
        )}

        {selectedMetrics.clicks && (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatNumber(data.reduce((sum, d) => sum + d.clicks, 0))}
            </div>
            <div className="text-xs text-gray-400">Total Clicks</div>
          </div>
        )}

        {selectedMetrics.leads && (
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {formatNumber(data.reduce((sum, d) => sum + d.leads, 0))}
            </div>
            <div className="text-xs text-gray-400">Total Leads</div>
          </div>
        )}

        {selectedMetrics.ctr && (
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {formatPercentage(
                data.reduce((sum, d, _, arr) => sum + d.ctr, 0) / data.length,
              )}
            </div>
            <div className="text-xs text-gray-400">Avg CTR</div>
          </div>
        )}
      </div>
    </div>
  );
}
