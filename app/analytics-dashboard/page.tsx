'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { 
  Calendar, Users, MousePointer, Globe, TrendingUp, Eye, 
  Activity, Clock, Target, Filter, Download, RefreshCw, LogOut
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import type { AnalyticsData } from '@/app/lib/analytics/types';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'pageviews' | 'visitors' | 'clicks'>('pageviews');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('dashboardToken');
    if (token) {
      setAuthenticated(true);
      fetchAnalytics(token);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchAnalytics(localStorage.getItem('dashboardToken') || '');
      // Set up real-time updates
      const interval = setInterval(fetchRealtimeData, 30000); // Update every 30s
      return () => clearInterval(interval);
    }
  }, [dateRange, authenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      
      if (response.ok) {
        localStorage.setItem('dashboardToken', password);
        setAuthenticated(true);
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('Failed to authenticate');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboardToken');
    setAuthenticated(false);
    setData(null);
    setPassword('');
  };

  const fetchAnalytics = async (token: string) => {
    try {
      const response = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    if (!data || !authenticated) return;
    
    try {
      const response = await fetch('/api/analytics/realtime', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dashboardToken') || ''}`
        }
      });
      
      if (response.ok) {
        const realtimeData = await response.json();
        setData(prev => prev ? { ...prev, realtime: realtimeData } : null);
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(localStorage.getItem('dashboardToken') || '');
    setRefreshing(false);
  };

  const exportData = () => {
    if (!data) return;
    
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString()}.csv`;
    a.click();
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Analytics Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Real-time insights into your website performance
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Real-time Alert */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <Activity className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-800">
            <strong>{data.realtime.activeUsers}</strong> active users on your site right now
          </span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Page Views"
            value={data.overview.totalPageViews.toLocaleString()}
            icon={<Eye className="h-4 w-4" />}
            change={calculateChange(data.trends.daily)}
          />
          <MetricCard
            title="Unique Visitors"
            value={data.overview.uniqueVisitors.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            change={calculateVisitorChange(data.trends.daily)}
          />
          <MetricCard
            title="Total Clicks"
            value={data.overview.totalClicks.toLocaleString()}
            icon={<MousePointer className="h-4 w-4" />}
            change={calculateClickChange(data.trends.daily)}
          />
          <MetricCard
            title="Avg Session"
            value={data.overview.avgSessionDuration}
            icon={<Clock className="h-4 w-4" />}
          />
          <MetricCard
            title="Bounce Rate"
            value={`${data.overview.bounceRate}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            inverse
          />
          <MetricCard
            title="Conversion Rate"
            value={`${data.overview.conversionRate}%`}
            icon={<Target className="h-4 w-4" />}
            format="percentage"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {['overview', 'traffic', 'engagement', 'realtime', 'behavior'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    py-2 px-4 border-b-2 font-medium text-sm capitalize
                    ${activeTab === tab 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Trend Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Traffic Trends</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={selectedMetric === 'pageviews' ? 'default' : 'outline'}
                          onClick={() => setSelectedMetric('pageviews')}
                        >
                          Page Views
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedMetric === 'visitors' ? 'default' : 'outline'}
                          onClick={() => setSelectedMetric('visitors')}
                        >
                          Visitors
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedMetric === 'clicks' ? 'default' : 'outline'}
                          onClick={() => setSelectedMetric('clicks')}
                        >
                          Clicks
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={data.trends.daily}>
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey={selectedMetric}
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorMetric)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hourly Pattern */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Hourly Traffic Pattern</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.trends.hourly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="visits" 
                            stroke="#00C49F" 
                            strokeWidth={2}
                            dot={{ fill: '#00C49F' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Pages */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.traffic.topPages.map((page, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{page.path}</p>
                                <span className="text-sm text-gray-600">{page.views} views</span>
                              </div>
                              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{
                                    width: `${(page.views / data.traffic.topPages[0].views) * 100}%`
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Avg time: {page.avgTime}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Traffic Sources Tab */}
            {activeTab === 'traffic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Device Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.traffic.deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {data.traffic.deviceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Referrers */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Referrers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.traffic.topReferrers.map((referrer, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">
                                {referrer.referrer || 'Direct'}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{referrer.count}</p>
                              <p className="text-xs text-gray-500">{referrer.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Browser Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Browser Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.traffic.browserBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="browser" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Engagement Tab */}
            {activeTab === 'engagement' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Click Targets */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Click Heatmap</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.engagement.clickTargets} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="target" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#00C49F" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Scroll Depth */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Scroll Depth Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.engagement.scrollDepth.map((depth, index) => (
                          <div key={index}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{depth.depth}</span>
                              <span className="text-sm text-gray-600">{depth.percentage}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                                style={{ width: `${depth.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Exit Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Exit Pages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.engagement.exitPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{page.path}</p>
                            <p className="text-sm text-gray-500">Exit rate: {page.rate}%</p>
                          </div>
                          <span className="text-lg font-semibold text-red-600">
                            {page.exits} exits
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Real-time Tab */}
            {activeTab === 'realtime' && (
              <div className="space-y-6">
                {/* Active Users Map */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Users by Page</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data.realtime.currentPages.map((page, index) => (
                        <div key={index} className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">{page.path}</p>
                          <p className="text-2xl font-bold text-blue-600">{page.users}</p>
                          <p className="text-xs text-blue-700">active users</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Events Stream */}
                <Card>
                  <CardHeader>
                    <CardTitle>Live Event Stream</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {data.realtime.recentEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              event.type === 'pageview' ? 'bg-blue-500' : 
                              event.type === 'click' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">{event.type}</p>
                              <p className="text-xs text-gray-500">{event.path}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{event.device}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Behavior Tab */}
            {activeTab === 'behavior' && (
              <div className="space-y-6">
                {/* User Flow Visualization */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Journey Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">User flow visualization based on your analytics data</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Recordings Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Session Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        Session recording and heatmap features coming soon. These will provide visual insights into how users interact with your site.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, icon, change, format, inverse }: any) {
  const isPositive = inverse ? change < 0 : change > 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Utility functions
function calculateChange(daily: any[]): number {
  if (daily.length < 2) return 0;
  const current = daily[daily.length - 1].pageviews;
  const previous = daily[daily.length - 2].pageviews;
  return Math.round(((current - previous) / previous) * 100);
}

function calculateVisitorChange(daily: any[]): number {
  if (daily.length < 2) return 0;
  const current = daily[daily.length - 1].visitors;
  const previous = daily[daily.length - 2].visitors;
  return Math.round(((current - previous) / previous) * 100);
}

function calculateClickChange(daily: any[]): number {
  if (daily.length < 2) return 0;
  const current = daily[daily.length - 1].clicks;
  const previous = daily[daily.length - 2].clicks;
  return Math.round(((current - previous) / previous) * 100);
}

function renderCustomLabel(entry: any) {
  return `${entry.device} (${entry.percentage}%)`;
}

function convertToCSV(data: AnalyticsData): string {
  // Convert analytics data to CSV format
  const headers = ['Date', 'Page Views', 'Visitors', 'Clicks'];
  const rows = data.trends.daily.map(day => 
    [day.date, day.pageviews, day.visitors, day.clicks].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}