"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import SharedStaffCalendar from './SharedStaffCalendar';
import { Calendar, Users, Clock, Settings, TrendingUp, AlertCircle } from 'lucide-react';

interface StaffCalendarPageProps {
  organizationId: string;
  currentUserId?: string;
}

interface CalendarStats {
  totalBookingsToday: number;
  totalBookingsThisWeek: number;
  averageCapacityUtilization: number;
  upcomingConflicts: number;
  staffOnDuty: number;
}

const StaffCalendarPage: React.FC<StaffCalendarPageProps> = ({
  organizationId,
  currentUserId
}) => {
  const [stats, setStats] = useState<CalendarStats>({
    totalBookingsToday: 0,
    totalBookingsThisWeek: 0,
    averageCapacityUtilization: 0,
    upcomingConflicts: 0,
    staffOnDuty: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch calendar statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        // Fetch today's bookings
        const { data: todayBookings, error: todayError } = await supabase
          .from('staff_calendar_bookings')
          .select('id, current_bookings, max_capacity')
          .eq('organization_id', organizationId)
          .gte('start_time', startOfToday.toISOString())
          .lt('start_time', endOfToday.toISOString())
          .not('status', 'eq', 'cancelled');

        if (todayError) throw todayError;

        // Fetch this week's bookings
        const { data: weekBookings, error: weekError } = await supabase
          .from('staff_calendar_bookings')
          .select('id, current_bookings, max_capacity')
          .eq('organization_id', organizationId)
          .gte('start_time', startOfWeek.toISOString())
          .lt('start_time', endOfWeek.toISOString())
          .not('status', 'eq', 'cancelled');

        if (weekError) throw weekError;

        // Fetch staff count
        const { data: staffCount, error: staffError } = await supabase
          .from('staff_profiles')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId);

        if (staffError) throw staffError;

        // Calculate capacity utilization
        const totalCapacity = todayBookings?.reduce((sum, booking) => sum + (booking.max_capacity || 0), 0) || 0;
        const totalBookings = todayBookings?.reduce((sum, booking) => sum + (booking.current_bookings || 0), 0) || 0;
        const utilization = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

        setStats({
          totalBookingsToday: todayBookings?.length || 0,
          totalBookingsThisWeek: weekBookings?.length || 0,
          averageCapacityUtilization: Math.round(utilization),
          upcomingConflicts: 0, // This would require more complex conflict detection
          staffOnDuty: staffCount?.length || 0
        });

      } catch (err) {
        console.error('Error fetching calendar stats:', err);
        setError('Failed to load calendar statistics');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchStats();
    }
  }, [organizationId, supabase]);

  const statsCards = [
    {
      title: 'Today\'s Bookings',
      value: stats.totalBookingsToday,
      icon: Calendar,
      color: 'text-blue-500'
    },
    {
      title: 'This Week',
      value: stats.totalBookingsThisWeek,
      icon: Clock,
      color: 'text-green-500'
    },
    {
      title: 'Capacity Utilization',
      value: `${stats.averageCapacityUtilization}%`,
      icon: TrendingUp,
      color: 'text-purple-500'
    },
    {
      title: 'Staff Members',
      value: stats.staffOnDuty,
      icon: Users,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Staff Calendar</h1>
            <p className="text-gray-400">Manage staff schedules, bookings, and availability</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors">
              <Settings className="w-4 h-4" />
              <span>Calendar Settings</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${card.color.replace('text-', 'bg-').replace('500', '500/20')}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  {loading && (
                    <div className="animate-pulse bg-gray-600 h-4 w-8 rounded"></div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-white">
                    {loading ? '-' : card.value}
                  </p>
                  <p className="text-sm text-gray-400">{card.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-200">Error Loading Data</h4>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Calendar Component */}
        <div className="space-y-4">
          <SharedStaffCalendar 
            organizationId={organizationId}
            currentUserId={currentUserId}
            initialView="week"
          />
        </div>

        {/* Usage Tips */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Calendar Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <h4 className="font-medium text-white">Navigation</h4>
              <ul className="space-y-1">
                <li>• Use arrow keys to navigate dates</li>
                <li>• Click "Today" to return to current date</li>
                <li>• Switch between Day/Week/Month views</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-white">Booking Management</h4>
              <ul className="space-y-1">
                <li>• Click empty slots to create bookings</li>
                <li>• Drag bookings to reschedule (coming soon)</li>
                <li>• Click bookings to edit details</li>
                <li>• Color-coded by booking type</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-white">Filters & Views</h4>
              <ul className="space-y-1">
                <li>• Filter by staff members</li>
                <li>• Filter by booking types</li>
                <li>• Real-time updates across all users</li>
                <li>• Conflict detection and warnings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Day View</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">D</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Week View</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">W</kbd>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Month View</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Today</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">T</kbd>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Previous</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">←</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Next</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">→</kbd>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">New Booking</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">N</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Filters</span>
                <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200">F</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCalendarPage;