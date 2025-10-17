'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { checkEmergencyAuthClient } from '@/lib/auth/check-emergency'
import { Calendar, Users, DollarSign, Activity, MessageSquare, Settings, BarChart3, AlertTriangle } from 'lucide-react'

export default function EmergencyDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check emergency auth
    const emergencyAuth = checkEmergencyAuthClient()
    
    if (!emergencyAuth) {
      // Also check for bypass auth from test-login
      const testUserId = localStorage.getItem('test_user_id')
      const testUserEmail = localStorage.getItem('test_user_email')
      
      if (testUserId && testUserEmail) {
        setUser({
          id: testUserId,
          email: testUserEmail,
          name: 'Sam'
        })
      } else {
        router.push('/test-login')
        return
      }
    } else {
      setUser(emergencyAuth)
    }
    
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const dashboardCards = [
    { title: 'Total Leads', value: '247', icon: Users, change: '+12%', color: 'bg-blue-500' },
    { title: 'Active Members', value: '142', icon: Activity, change: '+5%', color: 'bg-green-500' },
    { title: 'Revenue', value: '£8,432', icon: DollarSign, change: '+18%', color: 'bg-purple-500' },
    { title: 'Classes Today', value: '8', icon: Calendar, change: '0%', color: 'bg-orange-500' },
  ]

  const quickActions = [
    { name: 'Lead Management', href: '/leads', icon: Users },
    { name: 'Bookings', href: '/booking', icon: Calendar },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Emergency Mode Banner */}
      <div className="bg-yellow-600 text-white px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Emergency Mode Active - Supabase Auth is experiencing issues</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Gymleadhub Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">Welcome back, {user?.email}</p>
            </div>
            
            {/* Interface Switcher for sam@gymleadhub.co.uk */}
            {user?.email === 'sam@gymleadhub.co.uk' && (
              <div className="flex gap-2">
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  SaaS Admin
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Gym Owner
                </Link>
                <Link
                  href="/portal"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Member Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-sm ${card.change.startsWith('+') ? 'text-green-400' : 'text-gray-400'}`}>
                    {card.change}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  href={action.href}
                  className="flex flex-col items-center justify-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Icon className="h-8 w-8 text-orange-500 mb-2" />
                  <span className="text-sm text-white text-center">{action.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="text-white">New lead: John Smith</p>
                <p className="text-sm text-gray-400">Interested in personal training</p>
              </div>
              <span className="text-sm text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <div>
                <p className="text-white">Class booking: Yoga @ 6pm</p>
                <p className="text-sm text-gray-400">Sarah Johnson booked a spot</p>
              </div>
              <span className="text-sm text-gray-400">3 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Payment received: £45</p>
                <p className="text-sm text-gray-400">Monthly membership - Mike Davis</p>
              </div>
              <span className="text-sm text-gray-400">5 hours ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}