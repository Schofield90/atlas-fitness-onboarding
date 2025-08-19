'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Users, DollarSign, Activity, TrendingUp, MessageSquare, Settings, BarChart3, LogOut } from 'lucide-react';

export default function QuickDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-orange-500">Atlas Fitness</h1>
              <span className="text-sm text-gray-400">Quick Access Dashboard</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Success Message */}
        <div className="mb-8 p-4 bg-green-900/20 border border-green-600 rounded-lg">
          <h2 className="text-lg font-semibold text-green-400 mb-2">✓ Dashboard Access Working!</h2>
          <p className="text-green-300 mb-3">
            This is a TEMPORARY navigation page to help you access the system while we fix authentication.
          </p>
          <button
            onClick={() => router.push('/dashboard/overview')}
            className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Go to REAL Dashboard →
          </button>
          <p className="text-xs text-gray-400 mt-2">
            (The real dashboard has charts, live data, and all features - try it now!)
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">ACTIVE</span>
            </div>
            <p className="text-2xl font-bold">127</p>
            <p className="text-sm text-gray-400">Members</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">TODAY</span>
            </div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-gray-400">Classes</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-gray-400">REVENUE</span>
            </div>
            <p className="text-2xl font-bold">£5,432</p>
            <p className="text-sm text-gray-400">This Month</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <span className="text-xs text-gray-400">GROWTH</span>
            </div>
            <p className="text-2xl font-bold">+12%</p>
            <p className="text-sm text-gray-400">vs Last Month</p>
          </div>
        </div>

        {/* Main Navigation */}
        <h3 className="text-xl font-semibold mb-4">Main Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => router.push('/leads')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Users className="h-8 w-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Leads & Customers</h3>
            <p className="text-gray-400 text-sm">Manage your leads and customer profiles</p>
          </button>
          
          <button 
            onClick={() => router.push('/booking')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Calendar className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Class Schedule</h3>
            <p className="text-gray-400 text-sm">View and manage class bookings</p>
          </button>
          
          <button 
            onClick={() => router.push('/billing')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <DollarSign className="h-8 w-8 text-yellow-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Billing</h3>
            <p className="text-gray-400 text-sm">Track payments and subscriptions</p>
          </button>
          
          <button 
            onClick={() => router.push('/classes/recurring')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Recurring Classes</h3>
            <p className="text-gray-400 text-sm">Set up recurring schedules</p>
          </button>
          
          <button 
            onClick={() => router.push('/test-whatsapp')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <MessageSquare className="h-8 w-8 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Communications</h3>
            <p className="text-gray-400 text-sm">Send messages to members</p>
          </button>
          
          <button 
            onClick={() => router.push('/analytics')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <BarChart3 className="h-8 w-8 text-indigo-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm">View business insights</p>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Settings className="h-8 w-8 text-gray-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">Configure preferences</p>
          </button>
          
          <button 
            onClick={() => router.push('/test-auth')}
            className="bg-orange-600 border border-orange-500 p-6 rounded-lg hover:bg-orange-700 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-white mb-3" />
            <h3 className="text-lg font-semibold mb-2 text-white">Test Auth</h3>
            <p className="text-orange-100 text-sm">Debug authentication issues</p>
          </button>
        </div>

        {/* Quick Actions */}
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3 mb-8">
          <button 
            onClick={() => router.push('/leads/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add New Lead
          </button>
          <button 
            onClick={() => router.push('/booking/new')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Schedule Class
          </button>
          <button 
            onClick={() => router.push('/billing/invoice/new')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            + Create Invoice
          </button>
          <button 
            onClick={() => router.push('/test-whatsapp')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Send Message
          </button>
        </div>

        {/* Info Box */}
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">ℹ️ About This Dashboard</h3>
          <p className="text-gray-300 mb-3">
            This is a simplified dashboard that bypasses authentication to give you immediate access to the system. 
            It's designed to work around the current authentication issues.
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• No authentication required</p>
            <p>• All navigation links are functional</p>
            <p>• Data shown is demonstration data</p>
            <p>• Use the "Test Auth" button to debug login issues</p>
          </div>
        </div>
      </div>
    </div>
  );
}