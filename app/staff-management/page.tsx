'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import StaffList from '../components/staff/StaffList'
import StaffForm from '../components/staff/StaffForm'
import TimesheetTable from '../components/staff/TimesheetTable'
import TimeOffRequests from '../components/staff/TimeOffRequests'
import ShiftSchedule from '../components/staff/ShiftSchedule'
import ClockInOut from '../components/staff/ClockInOut'
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { StaffProfile, StaffAPIResponse } from '../lib/types/staff'

type TabType = 'overview' | 'staff' | 'timesheets' | 'timeoff' | 'schedule'

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddStaffForm, setShowAddStaffForm] = useState(false)
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    activeStaff: 0,
    clockedIn: 0,
    pendingTimeOff: 0
  })

  useEffect(() => {
    fetchStaff()
    fetchMetrics()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff')
      const data: StaffAPIResponse<StaffProfile[]> = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff')
      }

      setStaff(data.data || [])
      
    } catch (err: any) {
      console.error('Error fetching staff:', err)
      setError('Unable to load staff data. Please try refreshing the page.')
      
      // Show toast notification
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-red-600 text-white'
      toast.textContent = 'Staff data temporarily unavailable'
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 300)
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Fetch basic metrics from staff data
      const staffResponse = await fetch('/api/staff')
      const staffData: StaffAPIResponse<StaffProfile[]> = await staffResponse.json()
      
      if (staffData.success && staffData.data) {
        const totalStaff = staffData.data.length
        const activeStaff = staffData.data.filter(s => s.status === 'active').length
        
        // TODO: Fetch timesheet and time-off data for more detailed metrics
        const timesheetResponse = await fetch('/api/staff/timesheets?status=active')
        const timeOffResponse = await fetch('/api/staff/time-off?status=pending')
        
        let clockedIn = 0
        let pendingTimeOff = 0
        
        if (timesheetResponse.ok) {
          const timesheetData = await timesheetResponse.json()
          clockedIn = timesheetData.data?.length || 0
        }
        
        if (timeOffResponse.ok) {
          const timeOffData = await timeOffResponse.json()
          pendingTimeOff = timeOffData.data?.length || 0
        }
        
        setMetrics({
          totalStaff,
          activeStaff,
          clockedIn,
          pendingTimeOff
        })
      }
    } catch (err) {
      console.error('Error fetching metrics:', err)
    }
  }

  const handleStaffCreated = () => {
    setShowAddStaffForm(false)
    fetchStaff()
    fetchMetrics()
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'timesheets', label: 'Timesheets', icon: Clock },
    { id: 'timeoff', label: 'Time Off', icon: Calendar },
    { id: 'schedule', label: 'Schedules', icon: Calendar }
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Staff Management</h1>
              <p className="text-gray-400 mt-1">
                Manage your team members, schedules, and time tracking
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddStaffForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Staff Member
              </Button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Total Staff</p>
                      <p className="text-2xl font-bold text-white">{metrics.totalStaff}</p>
                    </div>
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Active Staff</p>
                      <p className="text-2xl font-bold text-white">{metrics.activeStaff}</p>
                    </div>
                    <div className="p-2 bg-green-600 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Clocked In</p>
                      <p className="text-2xl font-bold text-white">{metrics.clockedIn}</p>
                    </div>
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Pending Requests</p>
                      <p className="text-2xl font-bold text-white">{metrics.pendingTimeOff}</p>
                    </div>
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recent Activity & Clock In/Out */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Clock In/Out</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ClockInOut onClockAction={fetchMetrics} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-gray-400 text-sm">
                          Activity tracking coming soon...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Today's Schedule Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-gray-400 text-sm">
                      Schedule preview coming soon...
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'staff' && (
              <StaffList
                staff={staff}
                loading={loading}
                onRefresh={fetchStaff}
                onEdit={() => fetchStaff()}
              />
            )}

            {activeTab === 'timesheets' && (
              <TimesheetTable
                onTimesheetUpdate={fetchMetrics}
              />
            )}

            {activeTab === 'timeoff' && (
              <TimeOffRequests
                onRequestUpdate={fetchMetrics}
              />
            )}

            {activeTab === 'schedule' && (
              <ShiftSchedule
                staff={staff}
                onScheduleUpdate={fetchMetrics}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Form Modal */}
      {showAddStaffForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Staff Member</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddStaffForm(false)}
                  className="p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <StaffForm
                onSuccess={handleStaffCreated}
                onCancel={() => setShowAddStaffForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}