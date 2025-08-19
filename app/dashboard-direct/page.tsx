'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../components/DashboardLayout'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, Users, DollarSign, Activity, TrendingUp, MessageSquare, Settings, BarChart3 } from 'lucide-react'

export default function DirectDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set the organization ID in localStorage for the session
    localStorage.setItem('organizationId', '63589490-8f55-4157-bd3a-e141594b748e')
    
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Only redirect if we're not already on the login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          router.push('/login')
        }
      } else {
        setUser(user)
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Auth check error:', error)
      setLoading(false)
    })
  }, [])

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
    )
  }

  return (
    <DashboardLayout userData={user}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Atlas Fitness CRM</h1>
          <p className="text-gray-300">Manage your gym operations from one central location</p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <p className="text-2xl font-bold">127</p>
            <p className="text-sm text-gray-400">Active Members</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <span className="text-xs text-gray-400">TODAY</span>
            </div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-gray-400">Classes Scheduled</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-gray-400">THIS MONTH</span>
            </div>
            <p className="text-2xl font-bold">£5,432</p>
            <p className="text-sm text-gray-400">Revenue</p>
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
        
        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <h3 className="text-lg font-semibold mb-2">Billing & Payments</h3>
            <p className="text-gray-400 text-sm">Track payments and subscriptions</p>
          </button>
          
          <button 
            onClick={() => router.push('/classes/recurring')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Recurring Classes</h3>
            <p className="text-gray-400 text-sm">Set up recurring class schedules</p>
          </button>
          
          <button 
            onClick={() => router.push('/test-whatsapp')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <MessageSquare className="h-8 w-8 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Communications</h3>
            <p className="text-gray-400 text-sm">Send WhatsApp & SMS messages</p>
          </button>
          
          <button 
            onClick={() => router.push('/analytics')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <BarChart3 className="h-8 w-8 text-indigo-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm">View business insights and reports</p>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="bg-gray-800 border border-gray-700 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <Settings className="h-8 w-8 text-gray-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">Configure your system preferences</p>
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/overview')}
            className="bg-orange-600 border border-orange-500 p-6 rounded-lg hover:bg-orange-700 transition-colors text-left"
          >
            <TrendingUp className="h-8 w-8 text-white mb-3" />
            <h3 className="text-lg font-semibold mb-2 text-white">Advanced Dashboard</h3>
            <p className="text-orange-100 text-sm">Try the full dashboard experience</p>
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => router.push('/leads/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add New Lead
            </button>
            <button 
              onClick={() => router.push('/booking/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Schedule Class
            </button>
            <button 
              onClick={() => router.push('/billing/invoice/new')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Create Invoice
            </button>
            <button 
              onClick={() => router.push('/test-whatsapp')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}