'use client'

import DashboardLayout from '../components/DashboardLayout'
import { Clock, TrendingUp, Users, Calendar, CreditCard, FileText } from 'lucide-react'

export default function PayrollPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Payroll Management</h1>
            <p className="text-gray-400">Streamline your gym's payroll and compensation tracking</p>
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

              <div className="bg-blue-900 bg-opacity-30 border border-blue-800 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <span className="font-semibold">Expected Launch:</span> Q2 2025
                </p>
                <p className="text-blue-200 text-xs mt-1">
                  We'll notify you as soon as this feature is available
                </p>
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
              <h3 className="text-lg font-semibold text-white mb-3">Current Alternatives</h3>
              <p className="text-gray-300 mb-3">
                While we build this feature, you can use our existing tools:
              </p>
              <div className="space-y-2">
                <a href="/staff" className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-white font-medium">Staff Management</p>
                      <p className="text-gray-400 text-sm">Track staff schedules and availability</p>
                    </div>
                  </div>
                </a>
                <a href="/reports" className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-white font-medium">Reports</p>
                      <p className="text-gray-400 text-sm">Export staff activity and performance data</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}