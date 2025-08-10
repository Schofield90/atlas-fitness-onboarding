'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { Calendar, Clock, Users, MapPin, Plus, Settings } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'
import BookingCalendar from '@/app/components/booking/BookingCalendar'

export default function ClassCalendarPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'settings'>('calendar')
  const supabase = createClient()

  useEffect(() => {
    fetchOrganizationId()
  }, [])

  const fetchOrganizationId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get organization ID
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (orgMember) {
        setOrganizationId(orgMember.org_id)
      } else {
        // Fallback
        setOrganizationId('63589490-8f55-4157-bd3a-e141594b748e')
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      setOrganizationId('63589490-8f55-4157-bd3a-e141594b748e')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Class Calendar</h1>
            <p className="text-gray-400 mt-1">View and manage gym class schedules and member bookings</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'calendar' && organizationId && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Class Schedule</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.location.href = '/classes'}
                    variant="outline"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Classes
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/classes'}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Class
                  </Button>
                </div>
              </div>
              
              <div className="h-[600px]">
                <BookingCalendar
                  organizationId={organizationId}
                  customerId={organizationId} // Temp - for admin view
                />
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Upcoming Classes</h2>
              <p className="text-gray-400">List view of classes coming soon...</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Class Calendar Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Default View</h3>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="week">Week View</option>
                    <option value="month">Month View</option>
                    <option value="day">Day View</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Time Zone</h3>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New York</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}