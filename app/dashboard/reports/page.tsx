'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Download, TrendingUp, Users, DollarSign, Activity, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function ReportsPage() {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [reportData, setReportData] = useState<any>({
    attendance: null,
    revenue: null,
    membership: null
  });

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: TrendingUp, color: 'text-blue-400' },
    { id: 'attendance', name: 'Attendance', icon: Users, color: 'text-green-400' },
    { id: 'revenue', name: 'Revenue', icon: DollarSign, color: 'text-yellow-400' },
    { id: 'membership', name: 'Membership Usage', icon: Activity, color: 'text-purple-400' }
  ];

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      const [attendanceRes, revenueRes, membershipRes] = await Promise.all([
        fetch(`/api/reports/attendance?${params}`),
        fetch(`/api/reports/revenue?${params}`),
        fetch(`/api/reports/membership-usage?${params}`)
      ]);

      const [attendance, revenue, membership] = await Promise.all([
        attendanceRes.json(),
        revenueRes.json(),
        membershipRes.json()
      ]);

      setReportData({ attendance, revenue, membership });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any, filename: string) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${dateRange.start}_${dateRange.end}.csv`;
    a.click();
  };

  const convertToCSV = (data: any) => {
    if (!data || !Array.isArray(data)) return '';
    
    const headers = Object.keys(data[0] || {});
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

  const renderOverview = () => {
    if (!reportData.attendance || !reportData.revenue || !reportData.membership) {
      return <div className="text-gray-400">Loading report data...</div>;
    }

    return (
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-gray-400">30 DAYS</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {reportData.attendance.summary.attendedCount}
            </h3>
            <p className="text-sm text-gray-400">Total Attendance</p>
            <p className="text-xs text-green-400 mt-2">
              {reportData.attendance.summary.attendanceRate}% attendance rate
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-xs text-gray-400">30 DAYS</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              £{reportData.revenue.summary.totalRevenue.toFixed(2)}
            </h3>
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-xs text-yellow-400 mt-2">
              £{reportData.revenue.summary.totalPending.toFixed(2)} pending
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-purple-400" />
              <span className="text-xs text-gray-400">ACTIVE</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {reportData.membership.summary.activeMemberships}
            </h3>
            <p className="text-sm text-gray-400">Active Memberships</p>
            <p className="text-xs text-blue-400 mt-2">
              {reportData.membership.summary.activationRate}% activation rate
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-orange-400" />
              <span className="text-xs text-gray-400">MRR</span>
            </div>
            <h3 className="text-2xl font-bold text-white">
              £{reportData.revenue.summary.mrr.toFixed(2)}
            </h3>
            <p className="text-sm text-gray-400">Monthly Recurring</p>
            <p className="text-xs text-green-400 mt-2">
              +12% from last month
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Revenue Trend */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={reportData.revenue.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip formatter={(value) => `£${value}`} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Membership Distribution */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Membership Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reportData.membership.planDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="activeCount"
                  label={({ name, activeCount }) => `${name} (${activeCount})`}
                >
                  {reportData.membership.planDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">AI-Driven Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-400 mb-2">Peak Attendance Times</h4>
              <div className="space-y-2">
                {reportData.attendance.peakTimes?.slice(0, 3).map((time: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-300">{time.time}</span>
                    <span className="text-white font-medium">{time.count} attendees</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Upsell Opportunities</h4>
              <div className="space-y-2">
                {reportData.membership.overutilizedMemberships?.slice(0, 3).map((member: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="text-gray-300">{member.customerName}</span>
                    <span className="text-yellow-400 ml-2">({member.usageRate}% used)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    const data = reportData.attendance;
    if (!data) return <div className="text-gray-400">Loading attendance data...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Total Bookings</p>
            <p className="text-2xl font-bold text-white">{data.summary.totalBookings}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Attended</p>
            <p className="text-2xl font-bold text-green-400">{data.summary.attendedCount}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">No Shows</p>
            <p className="text-2xl font-bold text-red-400">{data.summary.noShowCount}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Attendance Rate</p>
            <p className="text-2xl font-bold text-blue-400">{data.summary.attendanceRate}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Attendance */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Daily Attendance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.dailyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="attendance" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Class Type Performance */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Class Type Performance</h3>
            <div className="space-y-3">
              {data.classTypeStats?.slice(0, 5).map((cls: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{cls.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white">{cls.attended}/{cls.total}</span>
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${(cls.attended / cls.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Attendees */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Top Attendees</h3>
            <button
              onClick={() => exportToCSV(data.topAttendees, 'top_attendees')}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">Email</th>
                  <th className="text-right pb-2">Classes Attended</th>
                </tr>
              </thead>
              <tbody>
                {data.topAttendees?.map((attendee: any) => (
                  <tr key={attendee.id} className="border-b border-gray-700">
                    <td className="py-2 text-sm text-white">{attendee.name}</td>
                    <td className="py-2 text-sm text-gray-400">{attendee.email}</td>
                    <td className="py-2 text-sm text-white text-right">{attendee.attendanceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRevenueReport = () => {
    const data = reportData.revenue;
    if (!data) return <div className="text-gray-400">Loading revenue data...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">£{data.summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">£{data.summary.totalPending.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">MRR</p>
            <p className="text-2xl font-bold text-blue-400">£{data.summary.mrr.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Avg Transaction</p>
            <p className="text-2xl font-bold text-purple-400">
              £{data.summary.totalRevenue > 0 ? (data.summary.totalRevenue / data.topCustomers.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Daily Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip formatter={(value) => `£${value}`} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Type */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ type, amount }) => `${type}: £${amount.toFixed(0)}`}
                >
                  {data.revenueByType?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `£${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Top Customers by Revenue</h3>
            <button
              onClick={() => exportToCSV(data.topCustomers, 'top_customers_revenue')}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                  <th className="text-left pb-2">Customer</th>
                  <th className="text-left pb-2">Email</th>
                  <th className="text-right pb-2">Revenue</th>
                  <th className="text-right pb-2">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers?.map((customer: any) => (
                  <tr key={customer.id} className="border-b border-gray-700">
                    <td className="py-2 text-sm text-white">{customer.name}</td>
                    <td className="py-2 text-sm text-gray-400">{customer.email}</td>
                    <td className="py-2 text-sm text-green-400 text-right">£{customer.totalRevenue.toFixed(2)}</td>
                    <td className="py-2 text-sm text-gray-400 text-right">{customer.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMembershipReport = () => {
    const data = reportData.membership;
    if (!data) return <div className="text-gray-400">Loading membership data...</div>;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-400">{data.summary.activeMemberships}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Paused</p>
            <p className="text-2xl font-bold text-yellow-400">{data.summary.pausedMemberships}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Cancelled</p>
            <p className="text-2xl font-bold text-red-400">{data.summary.cancelledMemberships}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400">Activation Rate</p>
            <p className="text-2xl font-bold text-blue-400">{data.summary.activationRate}%</p>
          </div>
        </div>

        {/* Insights Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Most Popular Plan</h3>
            <p className="text-xl font-bold text-white">{data.insights?.mostPopularPlan}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Highest Revenue Plan</h3>
            <p className="text-xl font-bold text-white">{data.insights?.highestRevenuePlan}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Usage Rate</h3>
            <p className="text-xl font-bold text-white">{data.insights?.averageUsageRate?.toFixed(1)}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Membership Plans</h3>
            <div className="space-y-3">
              {data.planDistribution?.map((plan: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">{plan.name}</span>
                    <span className="text-sm text-white">{plan.activeCount} active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-400 h-2 rounded-full"
                        style={{ width: `${(plan.activeCount / data.summary.activeMemberships) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">£{plan.revenue.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Growth</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="newMemberships" fill="#10B981" />
                <Bar dataKey="cancellations" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Underutilized Memberships */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Underutilized Memberships
              <span className="text-xs text-gray-400 ml-2">(Retention Risk)</span>
            </h3>
            <div className="space-y-2">
              {data.underutilizedMemberships?.map((member: any) => (
                <div key={member.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{member.customerName}</span>
                  <span className="text-red-400">{member.usageRate}% used</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overutilized Memberships */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              High Usage Members
              <span className="text-xs text-gray-400 ml-2">(Upsell Opportunity)</span>
            </h3>
            <div className="space-y-2">
              {data.overutilizedMemberships?.map((member: any) => (
                <div key={member.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">{member.customerName}</span>
                  <span className="text-green-400">{member.usageRate}% used</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
            <p className="text-gray-400">Comprehensive insights into your gym's performance</p>
          </div>

          {/* Date Range Selector */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setDateRange({
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setDateRange({
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={fetchReportData}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Report Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeReport === report.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                <report.icon className={`w-5 h-5 ${activeReport === report.id ? 'text-white' : report.color}`} />
                {report.name}
              </button>
            ))}
          </div>

          {/* Report Content */}
          <div className="bg-gray-850 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                {activeReport === 'overview' && renderOverview()}
                {activeReport === 'attendance' && renderAttendanceReport()}
                {activeReport === 'revenue' && renderRevenueReport()}
                {activeReport === 'membership' && renderMembershipReport()}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}