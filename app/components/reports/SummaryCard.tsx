"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
} from "@/app/lib/reports/formatting";

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    period?: string;
    isPercentage?: boolean;
  };
  format?: "number" | "currency" | "percentage";
  currency?: string;
  locale?: string;
  className?: string;
  loading?: boolean;
  error?: string | null;
  onClick?: () => void;
  color?: "default" | "primary" | "success" | "warning" | "danger";
}

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  format = "number",
  currency = "GBP",
  locale = "en-GB",
  className = "",
  loading = false,
  error = null,
  onClick,
  color = "default",
}: SummaryCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === "string") return val;

    switch (format) {
      case "currency":
        return formatCurrency(val, currency, locale);
      case "percentage":
        return formatPercentage(val, 1, locale);
      case "number":
      default:
        return formatNumber(val, { locale });
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.type) {
      case "increase":
        return <TrendingUp className="h-3 w-3" />;
      case "decrease":
        return <TrendingDown className="h-3 w-3" />;
      case "neutral":
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "";

    switch (trend.type) {
      case "increase":
        return "text-green-400";
      case "decrease":
        return "text-red-400";
      case "neutral":
      default:
        return "text-gray-400";
    }
  };

  const getColorClasses = () => {
    const base = "bg-gray-800 border-gray-700";

    switch (color) {
      case "primary":
        return `${base} border-l-4 border-l-orange-500`;
      case "success":
        return `${base} border-l-4 border-l-green-500`;
      case "warning":
        return `${base} border-l-4 border-l-yellow-500`;
      case "danger":
        return `${base} border-l-4 border-l-red-500`;
      default:
        return base;
    }
  };

  const cardClassName = `
    ${getColorClasses()}
    border rounded-lg p-4 transition-all duration-200
    ${onClick ? "cursor-pointer hover:bg-gray-750 hover:border-gray-600 transform hover:scale-[1.02]" : ""}
    ${className}
  `;

  if (loading) {
    return (
      <div className={cardClassName}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="h-6 w-6 bg-gray-700 rounded"></div>
          </div>
          <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardClassName}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-400">{title}</p>
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div className="text-red-400">
          <p className="text-lg font-bold">Error</p>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName} onClick={onClick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <p className="text-2xl font-bold text-white">{formatValue(value)}</p>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>

      {/* Trend */}
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>
            {trend.isPercentage
              ? formatPercentage(Math.abs(trend.value), 1, locale)
              : formatNumber(Math.abs(trend.value), { locale })}
            {trend.period && ` ${trend.period}`}
          </span>
        </div>
      )}
    </div>
  );
}
