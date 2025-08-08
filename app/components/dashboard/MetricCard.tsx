'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  icon,
  loading = false 
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
          {icon && <div className="h-12 w-12 bg-gray-200 rounded-full"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {(subtitle || change !== undefined) && (
            <div className="flex items-center gap-2 mt-2">
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
              {change !== undefined && (
                <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="text-sm font-medium">
                    {Math.abs(change)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}