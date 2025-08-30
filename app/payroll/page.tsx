'use client'

import DashboardLayout from '../components/DashboardLayout'
import { Clock, TrendingUp, Users, Calendar, CreditCard, FileText } from 'lucide-react'

export default function PayrollPage() {
  const handleNavigateToStaff = () => {
    window.location.href = '/staff-management'
  }
  
  const handleNavigateToReports = () => {
    window.location.href = '/reports'
  }
  
  const handleJoinWaitlist = () => {
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg bg-green-600 text-white'
    toast.innerHTML = `
      <div class="font-medium">Added to Waitlist</div>
      <div class="text-sm opacity-90">We'll notify you when payroll features are ready</div>
    `
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Payroll & Compensation</h1>
                <p className="text-gray-400">Streamline your gym's payroll and staff compensation tracking</p>
              </div>
              <button
                onClick={handleJoinWaitlist}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h0z" />
                </svg>
                Join Waitlist
              </button>
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-full mb-4">
                  <CreditCard className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                Payroll System Coming Soon
              </h2>
              
              <p className="text-gray-300 mb-8">
                We're building a comprehensive payroll solution designed specifically for gyms and fitness centers.
                Track staff hours, calculate commissions, manage bonuses, and process payments all in one place.
              </p>

              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-700 rounded-lg p-4">
                  <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-white mb-1">Time Tracking</h3>
                  <p className="text-gray-400 text-sm">
                    Automated timesheet management and shift tracking
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-white mb-1">Commission Calculation</h3>
                  <p className="text-gray-400 text-sm">
                    Automatic commission and bonus calculations
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-white mb-1">Payslip Generation</h3>
                  <p className="text-gray-400 text-sm">
                    Digital payslips and tax documentation
                  </p>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-30 border border-blue-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-blue-300">Development Status: In Progress</span>
                  </div>
                  <span className="text-xs bg-blue-700 text-blue-100 px-2 py-1 rounded-full">75% Complete</span>
                </div>
                <p className="text-blue-200 text-sm mb-3">
                  <span className="font-semibold">Expected Launch:</span> Q2 2025
                </p>
                <div className="w-full bg-blue-900 rounded-full h-2 mb-3">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-blue-200 text-xs">
                    We'll notify you as soon as this feature is available
                  </p>
                  <button 
                    onClick={handleJoinWaitlist}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-blue-100 px-3 py-1 rounded transition-colors"
                  >
                    Get Notified
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">What's Included</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Staff hourly rates and salary management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Personal trainer commission tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Class instructor payment processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Bonus and incentive management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Integration with accounting software
                </li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Available Now</h3>
              <p className="text-gray-300 mb-4">
                While we build the full payroll system, you can use these existing tools to manage your staff:
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleNavigateToStaff}
                  className="w-full p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-orange-500" />
                      <div className="text-left">
                        <p className="text-white font-medium">Staff Management</p>
                        <p className="text-gray-400 text-sm">Manage staff profiles, schedules, and time tracking</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                <button 
                  onClick={handleNavigateToReports}
                  className="w-full p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-blue-500" />
                      <div className="text-left">
                        <p className="text-white font-medium">Staff Reports</p>
                        <p className="text-gray-400 text-sm">Export staff activity and performance data</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                {/* Quick Action Cards */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 bg-gray-750 rounded-lg border border-gray-600">
                    <h4 className="text-white font-medium text-sm mb-1">Manual Timesheet</h4>
                    <p className="text-gray-400 text-xs mb-2">Track hours manually for now</p>
                    <button className="text-orange-400 text-xs hover:text-orange-300">Create Template</button>
                  </div>
                  <div className="p-3 bg-gray-750 rounded-lg border border-gray-600">
                    <h4 className="text-white font-medium text-sm mb-1">Commission Tracker</h4>
                    <p className="text-gray-400 text-xs mb-2">Basic commission calculation</p>
                    <button className="text-blue-400 text-xs hover:text-blue-300">Download Excel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}