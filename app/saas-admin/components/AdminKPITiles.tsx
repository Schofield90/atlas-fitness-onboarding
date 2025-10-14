"use client";

import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

interface KPITileProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  format?: "number" | "currency" | "percentage";
}

function KPITile({
  title,
  value,
  change,
  changeLabel,
  format = "number",
}: KPITileProps) {
  const formatValue = () => {
    if (format === "currency") {
      return `£${typeof value === "number" ? value.toLocaleString() : value}`;
    }
    if (format === "percentage") {
      return `${value}%`;
    }
    return typeof value === "number" ? value.toLocaleString() : value;
  };

  const isPositive = change && change > 0;

  return (
    <div className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <dt className="text-sm font-medium text-gray-400 truncate">
              {title}
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-white">
              {formatValue()}
            </dd>
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center text-sm">
            <span
              className={`flex items-center ${isPositive ? "text-green-400" : "text-red-400"}`}
            >
              {isPositive ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(change)}%
            </span>
            {changeLabel && (
              <span className="ml-2 text-gray-400">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminKPITilesProps {
  metrics: any;
}

export default function AdminKPITiles({ metrics }: AdminKPITilesProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-700 animate-pulse"
          >
            <div className="p-5">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <KPITile
        title="Active Gyms"
        value={metrics.active_subscriptions || 0}
        change={12}
        changeLabel="from last month"
        format="number"
      />
      <KPITile
        title="Total MRR"
        value={metrics.total_mrr || 0}
        change={8}
        changeLabel="from last month"
        format="currency"
      />
      <KPITile
        title="Total ARR"
        value={metrics.total_arr || 0}
        change={15}
        changeLabel="YoY"
        format="currency"
      />
      <KPITile
        title="Platform Fees (30d)"
        value={metrics.platform_fees_30d || 0}
        change={5}
        changeLabel="from previous period"
        format="currency"
      />
    </div>
  );
}
