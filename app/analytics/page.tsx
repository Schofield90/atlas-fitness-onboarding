'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  DollarSign,
  Activity,
  Clock,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalMembers: number;
    activeMembers: number;
    monthlyRevenue: number;
    classAttendance: number;
  };
  trends: {
    memberGrowth: number;
    revenueGrowth: number;
    retentionRate: number;
  };
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'revenue' | 'classes'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  // Mock analytics data for demonstration
  const analyticsData: AnalyticsData = {
    overview: {
      totalMembers: 247,
      activeMembers: 189,
      monthlyRevenue: 18420,
      classAttendance: 1043
    },
    trends: {
      memberGrowth: 12.5,
      revenueGrowth: 8.3,
      retentionRate: 87.2
    }
  };
  
  const isAnalyticsBeta = isFeatureEnabled('analyticsBeta');
  const isAnalyticsEnabled = isFeatureEnabled('analyticsReporting');
  
  const renderComingSoonFeature = (title: string, description: string, icon: React.ReactNode) => (
    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
      <div className="flex flex-col items-center">
        <div className="p-4 bg-gray-700 rounded-full mb-4 opacity-50">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 max-w-md mb-6">{description}</p>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
            Coming Soon
          </div>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderDemoData = () => (
    <div className="space-y-6">
      {/* Alert Banner */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-blue-300 font-medium mb-1">Demo Analytics Data</div>
            <div className="text-blue-200 text-sm mb-3">
              Advanced analytics features are in development. The data shown below is for demonstration purposes.
            </div>
            <button 
              onClick={() => {
                const toast = document.createElement('div')
                toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg bg-blue-600 text-white'
                toast.innerHTML = `
                  <div class="font-medium">Request Analytics Access</div>
                  <div class="text-sm opacity-90">We'll notify you when full analytics are available</div>
                `
                document.body.appendChild(toast)
                setTimeout(() => {
                  toast.style.opacity = '0'
                  setTimeout(() => document.body.removeChild(toast), 300)
                }, 3000)
              }}
              className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-blue-100 rounded transition-colors"
            >
              Request Early Access
            </button>
          </div>
        </div>
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Members</p>
              <p className="text-2xl font-bold text-white">{analyticsData.overview.totalMembers}</p>
            </div>
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-500">+{analyticsData.trends.memberGrowth}%</span>
            <span className="text-gray-400 ml-1">vs last month</span>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Active Members</p>
              <p className="text-2xl font-bold text-white">{analyticsData.overview.activeMembers}</p>
            </div>
            <div className="p-3 bg-green-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-500">{analyticsData.trends.retentionRate}%</span>
            <span className="text-gray-400 ml-1">retention rate</span>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white">£{analyticsData.overview.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-500">+{analyticsData.trends.revenueGrowth}%</span>
            <span className="text-gray-400 ml-1">vs last month</span>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Class Attendance</p>
              <p className="text-2xl font-bold text-white">{analyticsData.overview.classAttendance}</p>
            </div>
            <div className="p-3 bg-purple-600 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <Clock className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-blue-500">This month</span>
            <span className="text-gray-400 ml-1">across all classes</span>
          </div>
        </div>
      </div>
      
      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Member Growth</h3>
          <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Interactive charts coming soon</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trends</h3>
          <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Revenue analytics in development</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics & Reporting</h1>
              <p className="text-gray-400 mt-1">Track your gym's performance and member engagement</p>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'members', label: 'Members', icon: Users },
              { key: 'revenue', label: 'Revenue', icon: DollarSign },
              { key: 'classes', label: 'Classes', icon: Calendar }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === key
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          {activeTab === 'overview' && (
            isAnalyticsBeta ? renderDemoData() : 
            isAnalyticsEnabled ? renderDemoData() : 
            renderComingSoonFeature(
              'Analytics Dashboard', 
              'Get comprehensive insights into your gym\'s performance with detailed analytics and reporting tools.',
              <BarChart3 className="w-8 h-8" />
            )
          )}
          
          {activeTab === 'members' && renderComingSoonFeature(
            'Member Analytics', 
            'Track member engagement, retention rates, and demographic insights to better serve your community.',
            <Users className="w-8 h-8" />
          )}
          
          {activeTab === 'revenue' && renderComingSoonFeature(
            'Revenue Analytics', 
            'Monitor your financial performance with detailed revenue tracking, forecasting, and trend analysis.',
            <DollarSign className="w-8 h-8" />
          )}
          
          {activeTab === 'classes' && renderComingSoonFeature(
            'Class Analytics', 
            'Analyze class attendance, popular time slots, and optimize your schedule for maximum engagement.',
            <Calendar className="w-8 h-8" />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}