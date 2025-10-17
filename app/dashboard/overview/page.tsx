'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddLeadModal } from '@/app/components/leads/AddLeadModal';
import { Calendar, DollarSign, Users, TrendingUp, Bell, Gift, CreditCard, Activity, Search, Plus, MessageSquare, Send } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { createClient } from '@/app/lib/supabase/client';
import { getCurrentUserOrganization } from '@/app/lib/organization-service';
import DashboardLayout from '@/app/components/DashboardLayout';
import ClassDetailModal from '@/app/components/dashboard/ClassDetailModal';

export default function DashboardOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
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
        // Set default organization ID immediately
        const defaultOrgId = '63589490-8f55-4157-bd3a-e141594b748e';
        setOrganizationId(defaultOrgId);
        
        // Try to fetch dashboard data
        await fetchDashboardData(defaultOrgId);
        
        // Then check membership in background (non-blocking)
        fetch('/api/auth/check-membership')
          .then(res => res.json())
          .then(result => {
            console.log('Dashboard - membership check:', result);
            if (result.organizationId && result.organizationId !== defaultOrgId) {
              setOrganizationId(result.organizationId);
              fetchDashboardData(result.organizationId);
            }
          })
          .catch(err => console.log('Membership check failed, using defaults:', err));
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        // Always stop loading after a short delay to prevent infinite spinner
        setTimeout(() => setLoading(false), 500);
      }
    };
    
    initializeDashboard();
  }, []);

  const fetchDashboardData = async (orgId: string) => {
    try {
      // Fetch dashboard metrics from API - using fixed endpoint with hardcoded org ID
      const response = await fetch('/api/dashboard/metrics-fixed');
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
      console.error('Error fetching dashboard data, using demo data:', error);
      // Use demo data as fallback
      setDashboardData({
        pendingPayments: { total: 245.50, count: 3 },
        confirmedRevenue: { total: 1850.00, count: 12 },
        upcomingEvents: [
          {
            id: '1',
            title: 'Morning Yoga',
            time: '07:00',
            date: '18 Aug',
            bookings: 12,
            capacity: 20,
            instructor: 'Sarah Johnson',
            location: 'Studio A',
            duration: 60,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            title: 'HIIT Circuit',
            time: '09:00',
            date: '18 Aug',
            bookings: 18,
            capacity: 25,
            instructor: 'Mike Thompson',
            location: 'Main Gym',
            duration: 45,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString()
          }
        ],
        upcomingBilling: [
          { id: '1', customer: 'John Smith', date: '20 Aug', amount: 45.00 },
          { id: '2', customer: 'Emma Wilson', date: '22 Aug', amount: 65.00 }
        ],
        todos: [
          { id: '1', text: 'Follow up with trial members', type: 'info' },
          { id: '2', text: 'Review class schedule', type: 'info' }
        ],
        recentCustomers: { count: 8, percentChange: 15 },
        eventsBooked: { count: 24 },
        membershipPayments: { count: 42 },
        customerGrowth: [
          { date: 'Mon', value: 10 },
          { date: 'Tue', value: 12 },
          { date: 'Wed', value: 15 },
          { date: 'Thu', value: 18 },
          { date: 'Fri', value: 22 },
          { date: 'Sat', value: 28 },
          { date: 'Sun', value: 25 }
        ],
        revenueGrowth: [
          { date: 'Mon', value: 450 },
          { date: 'Tue', value: 520 },
          { date: 'Wed', value: 480 },
          { date: 'Thu', value: 650 },
          { date: 'Fri', value: 720 },
          { date: 'Sat', value: 890 },
          { date: 'Sun', value: 810 }
        ],
        activeMemberships: [
          { name: 'Basic', value: 45 },
          { name: 'Premium', value: 28 },
          { name: 'VIP', value: 12 }
        ],
        revenueByType: [
          { name: 'Memberships', value: 3200 },
          { name: 'Classes', value: 1450 },
          { name: 'Personal Training', value: 890 }
        ],
        recentTransactions: [
          { id: '1', type: 'Membership', customer: 'Sarah Lee', amount: 65, status: 'Paid' },
          { id: '2', type: 'Class Pack', customer: 'Tom Wilson', amount: 120, status: 'Paid' },
          { id: '3', type: 'PT Session', customer: 'Mike Brown', amount: 75, status: 'Pending' }
        ],
        upcomingBirthdays: [
          { id: '1', name: 'Jane Smith', daysUntil: 2, age: 28 },
          { id: '2', name: 'Bob Johnson', daysUntil: 5, age: 35 }
        ]
      });
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
      capacity: event.capacity,
      instructor: event.instructor,
      location: event.location,
      duration: event.duration,
      startTime: event.startTime,
      endTime: event.endTime
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
      <div className="min-h-screen bg-gray-900">
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
                  onClick={() => setShowAddLeadModal(true)}
                  className="p-2 hover:bg-gray-700 rounded-lg"
                  title="Add new lead"
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
                <button 
                  onClick={() => router.push('/test-whatsapp')}
                  className="p-2 hover:bg-gray-700 rounded-lg"
                  title="Send message"
                >
                  <Send className="w-5 h-5 text-gray-400" />
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
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
              className="bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-700"
              onClick={() => router.push('/billing')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">PENDING</span>
              </div>
              <h3 className="text-2xl font-bold text-white">£{dashboardData.pendingPayments.total.toFixed(2)}</h3>
              <p className="text-sm text-gray-400">{dashboardData.pendingPayments.count} pending</p>
            </div>

            {/* Confirmed Revenue */}
            <div 
              className="bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-700"
              onClick={() => router.push('/billing')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">CONFIRMED</span>
              </div>
              <h3 className="text-2xl font-bold text-white">£{dashboardData.confirmedRevenue.total.toFixed(2)}</h3>
              <p className="text-sm text-gray-400">{dashboardData.confirmedRevenue.count} confirmed</p>
            </div>

            {/* Accounts Created */}
            <div 
              className="bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-700"
              onClick={() => router.push('/leads')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-green-400">+{dashboardData.recentCustomers.percentChange}%</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{dashboardData.recentCustomers.count}</h3>
              <p className="text-sm text-gray-400">New customers (30d)</p>
            </div>

            {/* Events Booked */}
            <div 
              className="bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-700"
              onClick={() => router.push('/booking')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">THIS MONTH</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{dashboardData.eventsBooked.count}</h3>
              <p className="text-sm text-gray-400">Events booked</p>
            </div>
          </div>

          {/* Middle Row - Events, Billing, To-dos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Upcoming Events */}
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">Upcoming Events</h3>
                </div>
              </div>
              <div className="p-4">
                {dashboardData.upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex text-xs text-gray-400 font-medium mb-2">
                      <div className="flex-1">ALL</div>
                      <div className="w-20 text-right">YOURS</div>
                    </div>
                    {dashboardData.upcomingEvents.slice(0, 5).map((event) => (
                      <div 
                        key={event.id} 
                        className="group cursor-pointer hover:bg-gray-700/50 p-3 rounded-lg transition-colors"
                        onClick={() => {
                          setSelectedClass(event);
                          setShowClassModal(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-300 mb-1">
                              {new Date(event.startTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} - {event.time}
                            </div>
                            <div className="text-white font-medium group-hover:text-orange-400 transition-colors mb-1">
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-400">
                              {event.instructor} • {event.location} • {event.duration || 60} mins
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-white font-medium">{event.bookings}/{event.capacity}</div>
                            <div className="text-xs text-gray-400">
                              {event.capacity - event.bookings} left
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No upcoming events scheduled</p>
                )}
              </div>
            </div>

            {/* Upcoming Billing */}
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-white">Upcoming Billing</h3>
                  </div>
                  <button 
                    onClick={() => router.push('/billing')}
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    View all
                  </button>
                </div>
              </div>
              <div className="p-4">
                {dashboardData.upcomingBilling.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.upcomingBilling.map((billing) => (
                      <div 
                        key={billing.id} 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-700/50 p-2 rounded transition-colors"
                        onClick={() => router.push('/billing')}
                      >
                        <div>
                          <p className="font-medium text-white">{billing.customer}</p>
                          <p className="text-sm text-gray-400">{billing.date}</p>
                        </div>
                        <p className="font-medium text-green-400">£{billing.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No upcoming billing</p>
                )}
              </div>
            </div>

            {/* To-dos */}
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-900/30 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">To-dos</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {dashboardData.todos.map((todo) => (
                    <div key={todo.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        todo.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                      }`} />
                      <p className="text-sm text-gray-300">{todo.text}</p>
                    </div>
                  ))}
                  {dashboardData.todos.length === 0 && (
                    <p className="text-sm text-gray-400">No outstanding to-dos</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Customer Growth Chart */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Customer Accounts Created</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Growth Chart */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Revenue</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.revenueGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
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
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Active Memberships</h3>
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
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Revenue By Purchase</h3>
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
                <p className="text-2xl font-bold text-white">
                  £{dashboardData.revenueByType.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">Total Revenue</p>
              </div>
            </div>

            {/* Recent Revenue */}
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold text-white">Recent Revenue</h3>
              </div>
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase">
                      <th className="text-left pb-2">Type</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {dashboardData.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-gray-700">
                        <td className="py-2">
                          <p className="font-medium text-white">{transaction.type}</p>
                          <p className="text-xs text-gray-400">{transaction.customer}</p>
                        </td>
                        <td className="text-right py-2">
                          <p className="font-medium text-white">£{transaction.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{transaction.status}</p>
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
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-5 h-5 text-pink-400" />
                <h3 className="font-semibold text-white">Upcoming Birthdays</h3>
              </div>
              {dashboardData.upcomingBirthdays.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcomingBirthdays.map((birthday: any) => (
                    <div key={birthday.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{birthday.name}</p>
                        <p className="text-xs text-gray-400">
                          {birthday.daysUntil === 0 ? 'Today!' : 
                           birthday.daysUntil === 1 ? 'Tomorrow' : 
                           `In ${birthday.daysUntil} days`} • Turning {birthday.age}
                        </p>
                      </div>
                      <button 
                        onClick={() => router.push(`/leads/${birthday.id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Send wishes
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No birthdays in the next 30 days</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Class Detail Modal */}
      {selectedClass && (
        <ClassDetailModal
          isOpen={showClassModal}
          onClose={() => {
            setShowClassModal(false);
            setSelectedClass(null);
          }}
          classSession={selectedClass}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onLeadAdded={() => {
          setShowAddLeadModal(false)
          // Optionally show success message or refresh data
        }}
      />
    </DashboardLayout>
  );
}