'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CreditCard,
  UserPlus,
  CalendarCheck,
  Activity,
  Target
} from 'lucide-react';
import MetricCard from './MetricCard';
import { formatBritishCurrency } from '@/app/lib/utils/british-format';

interface DashboardMetrics {
  revenue: {
    mtd: number;
    growth: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
    conversionRate: number;
  };
  bookings: {
    today: number;
    week: number;
    cancellationRate: number;
    attendanceRate: number;
  };
  sessions: {
    upcoming: number;
    capacity: number;
  };
}

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/v2/analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      </div>

      {/* Revenue & Leads Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Revenue"
          value={metrics ? formatBritishCurrency(metrics.revenue.mtd, false) : '£0'}
          change={metrics?.revenue.growth}
          icon={<CreditCard className="h-12 w-12 text-green-500" />}
          loading={loading}
        />
        
        <MetricCard
          title="Total Leads"
          value={metrics?.leads.total || 0}
          subtitle={`${metrics?.leads.new || 0} new this month`}
          icon={<Users className="h-12 w-12 text-blue-500" />}
          loading={loading}
        />
        
        <MetricCard
          title="Qualified Leads"
          value={metrics?.leads.qualified || 0}
          subtitle={`${metrics?.leads.conversionRate.toFixed(1) || 0}% conversion`}
          icon={<Target className="h-12 w-12 text-purple-500" />}
          loading={loading}
        />
        
        <MetricCard
          title="Bookings Today"
          value={metrics?.bookings.today || 0}
          subtitle={`${metrics?.bookings.week || 0} this week`}
          icon={<Calendar className="h-12 w-12 text-orange-500" />}
          loading={loading}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Attendance Rate"
          value={`${metrics?.bookings.attendanceRate.toFixed(1) || 0}%`}
          icon={<CalendarCheck className="h-12 w-12 text-green-500" />}
          loading={loading}
        />
        
        <MetricCard
          title="Cancellation Rate"
          value={`${metrics?.bookings.cancellationRate.toFixed(1) || 0}%`}
          icon={<Activity className="h-12 w-12 text-red-500" />}
          loading={loading}
        />
        
        <MetricCard
          title="Class Capacity"
          value={`${metrics?.sessions.capacity.toFixed(0) || 0}%`}
          subtitle={`${metrics?.sessions.upcoming || 0} upcoming sessions`}
          icon={<TrendingUp className="h-12 w-12 text-indigo-500" />}
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <UserPlus className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium">Add Lead</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium">Book Class</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <CreditCard className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium">Process Payment</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <Activity className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}