'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, DollarSign, Users, TrendingUp, Bell, Gift, CreditCard, Activity, Search, Plus, MessageSquare, Send } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentUserOrganization } from '@/app/lib/organization-service';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function DashboardOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState({
    pendingPayments: { total: 0, count: 0 },
    confirmedRevenue: { total: 0, count: 0 },
    upcomingEvents: [],
    upcomingBilling: [],
    todos: [],
    recentCustomers: { count: 0, percentChange: 0 },
    eventsBooked: { count: 0 },
    membershipPayments: { count: 0 },
    customerGrowth: [],
    revenueGrowth: [],
    activeMemberships: [],
    revenueByType: [],
    recentTransactions: [],
    upcomingBirthdays: []
  });

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { organizationId: orgId } = await getCurrentUserOrganization();
        if (orgId) {
          setOrganizationId(orgId);
          await fetchDashboardData(orgId);
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    };
    
    initializeDashboard();
  }, []);

  const fetchDashboardData = async (orgId: string) => {
    setLoading(true);
    try {
      // Fetch dashboard metrics from API
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      
      // Fetch chart data separately
      const chartResponse = await fetch('/api/dashboard/charts');
      const chartData = await chartResponse.json();

      setDashboardData({
        pendingPayments: data.metrics.pendingPayments,
        confirmedRevenue: data.metrics.confirmedRevenue,
        upcomingEvents: formatUpcomingEvents(data.upcomingEvents),
        upcomingBilling: data.upcomingBilling,
        todos: generateTodosFromData(data),
        recentCustomers: {
          count: data.metrics.newCustomers.count,
          percentChange: data.metrics.newCustomers.growthPercentage
        },
        eventsBooked: {
          count: data.metrics.bookingsThisMonth
        },
        membershipPayments: {
          count: data.metrics.activeMemberships
        },
        customerGrowth: chartData?.customerGrowth || [],
        revenueGrowth: chartData?.revenueGrowth || [],
        activeMemberships: data.membershipBreakdown,
        revenueByType: data.revenueByType,
        recentTransactions: data.recentTransactions,
        upcomingBirthdays: data.upcomingBirthdays || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatUpcomingEvents = (events: any[]) => {
    return events?.map(event => ({
      id: event.id,
      title: event.title,
      time: new Date(event.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(event.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: event.bookings,
      capacity: event.capacity
    })) || [];
  };

  const generateTodosFromData = (data: any) => {
    const todos = [];
    
    // Check for classes with low bookings
    data.upcomingEvents?.forEach((event: any) => {
      const bookingRate = event.bookings / event.capacity;
      if (bookingRate < 0.5) {
        todos.push({
          id: event.id,
          text: `${event.title} has low bookings (${event.bookings}/${event.capacity})`,
          type: 'warning'
        });
      }
    });

    // Check for pending payments
    if (data.metrics.pendingPayments.count > 0) {
      todos.push({
        id: 'pending-payments',
        text: `${data.metrics.pendingPayments.count} pending payments totaling £${data.metrics.pendingPayments.total}`,
        type: 'info'
      });
    }

    return todos.slice(0, 5);
  };

  const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
              <p className="text-gray-300">Welcome back! Here's what's happening in your gym today.</p>
            </div>
            <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <button 
              onClick={() => router.push('/leads/new')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Add new lead"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => router.push('/test-whatsapp')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Send message"
            >
              <Send className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => router.push('/settings/notifications')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </button>
          </div>
        </div>
      </div>

        {/* Quick Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers, classes, or transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  router.push(`/leads?search=${encodeURIComponent(e.currentTarget.value)}`);
                }
              }}
            />
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Pending Payments */}
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/billing')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">PENDING</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">£{dashboardData.pendingPayments.total.toFixed(2)}</h3>
            <p className="text-sm text-gray-600">{dashboardData.pendingPayments.count} pending</p>
          </div>

          {/* Confirmed Revenue */}
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/billing')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">CONFIRMED</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">£{dashboardData.confirmedRevenue.total.toFixed(2)}</h3>
            <p className="text-sm text-gray-600">{dashboardData.confirmedRevenue.count} confirmed</p>
          </div>

          {/* Accounts Created */}
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/leads')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-green-600">+{dashboardData.recentCustomers.percentChange}%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{dashboardData.recentCustomers.count}</h3>
            <p className="text-sm text-gray-600">New customers (30d)</p>
          </div>

          {/* Events Booked */}
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/booking')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">THIS MONTH</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{dashboardData.eventsBooked.count}</h3>
            <p className="text-sm text-gray-600">Events booked</p>
          </div>
        </div>

        {/* Middle Row - Events, Billing, To-dos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
              <button 
                onClick={() => router.push('/booking')}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {dashboardData.upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => router.push('/booking')}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{event.bookings}/{event.capacity}</p>
                      <p className="text-xs text-gray-600">Booked</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Billing */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upcoming Billing</h3>
              <button 
                onClick={() => router.push('/billing')}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {dashboardData.upcomingBilling.map((billing) => (
                  <div 
                    key={billing.id} 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => router.push('/billing')}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{billing.customer}</p>
                      <p className="text-sm text-gray-600">{billing.date}</p>
                    </div>
                    <p className="font-medium text-gray-900">£{billing.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* To-dos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">To-dos</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {dashboardData.todos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      todo.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <p className="text-sm text-gray-700">{todo.text}</p>
                  </div>
                ))}
                {dashboardData.todos.length === 0 && (
                  <p className="text-sm text-gray-500">No outstanding to-dos</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Customer Growth Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer Accounts Created</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Growth Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.revenueGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip formatter={(value) => `£${value}`} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row - Memberships & Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Memberships */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Active Memberships</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.activeMemberships}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {dashboardData.activeMemberships.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Purchase */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue By Purchase</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.revenueByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `£${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                £{dashboardData.revenueByType.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>

          {/* Recent Revenue */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Recent Revenue</h3>
            </div>
            <div className="p-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left pb-2">Type</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {dashboardData.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-gray-100">
                      <td className="py-2">
                        <p className="font-medium text-gray-900">{transaction.type}</p>
                        <p className="text-xs text-gray-600">{transaction.customer}</p>
                      </td>
                      <td className="text-right py-2">
                        <p className="font-medium text-gray-900">£{transaction.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-600">{transaction.status}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Birthday Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-5 h-5 text-pink-600" />
              <h3 className="font-semibold text-gray-900">Upcoming Birthdays</h3>
            </div>
            {dashboardData.upcomingBirthdays.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingBirthdays.map((birthday: any) => (
                  <div key={birthday.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{birthday.name}</p>
                      <p className="text-xs text-gray-600">
                        {birthday.daysUntil === 0 ? 'Today!' : 
                         birthday.daysUntil === 1 ? 'Tomorrow' : 
                         `In ${birthday.daysUntil} days`} • Turning {birthday.age}
                      </p>
                    </div>
                    <button 
                      onClick={() => router.push(`/leads/${birthday.id}`)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Send wishes
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No birthdays in the next 30 days</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}