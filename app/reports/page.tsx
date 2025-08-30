'use client'

import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { isFeatureEnabled } from '@/app/lib/feature-flags'
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, FileText, Download } from 'lucide-react'

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const isReportingBeta = isFeatureEnabled('reportingBeta')
  const isReportingEnabled = isFeatureEnabled('analyticsReporting')
  
  // Mock report data
  const mockReports = {
    revenue: {
      title: 'Revenue Report',
      summary: 'Total Revenue: £45,320',
      trend: '+15% from last month',
      data: [
        { month: 'Jan', revenue: 12500 },
        { month: 'Feb', revenue: 14200 },
        { month: 'Mar', revenue: 18620 }
      ]
    },
    attendance: {
      title: 'Attendance Report',
      summary: 'Average Attendance: 87%',
      trend: '+5% from last month',
      data: [
        { week: 'Week 1', attendance: 245 },
        { week: 'Week 2', attendance: 268 },
        { week: 'Week 3', attendance: 289 },
        { week: 'Week 4', attendance: 301 }
      ]
    },
    members: {
      title: 'Member Report',
      summary: 'Total Members: 312',
      trend: '+23 new members this month',
      data: [
        { status: 'Active', count: 289 },
        { status: 'Inactive', count: 23 }
      ]
    }
  }
  
  const renderBetaReports = () => {
    return (
      <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Beta</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Revenue Report</h3>
          <p className="text-2xl font-bold text-white mt-2">£45,320</p>
          <p className="text-sm text-green-400 mt-1">+15% from last month</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Beta</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Attendance Report</h3>
          <p className="text-2xl font-bold text-white mt-2">87%</p>
          <p className="text-sm text-green-400 mt-1">+5% from last month</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Beta</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Member Report</h3>
          <p className="text-2xl font-bold text-white mt-2">312</p>
          <p className="text-sm text-green-400 mt-1">+23 new this month</p>
        </div>
      </div>
      
      {/* Report Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Generate Custom Report</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            <Download className="h-4 w-4" />
            Export All Reports
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
            <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option>Revenue Analysis</option>
              <option>Member Growth</option>
              <option>Class Performance</option>
              <option>Staff Performance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
            <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option>Last 30 days</option>
              <option>Last Quarter</option>
              <option>Last Year</option>
              <option>Custom Range</option>
            </select>
          </div>
        </div>
        <button 
          onClick={() => {
            const toast = document.createElement('div')
            toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg bg-green-600 text-white'
            toast.innerHTML = 'Report generated successfully! (Demo)'
            document.body.appendChild(toast)
            setTimeout(() => {
              toast.style.opacity = '0'
              setTimeout(() => document.body.removeChild(toast), 300)
            }, 3000)
          }}
          className="mt-4 w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          Generate Report
        </button>
      </div>
    </div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Conditionally render based on feature flags */}
          {isReportingBeta ? (
            renderBetaReports()
          ) : isReportingEnabled ? (
            renderBetaReports()
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Revenue Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Revenue Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Track income, payments, and financial performance</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Attendance Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Attendance Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Monitor class attendance and participation rates</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Member Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Member Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Analyze member growth and retention metrics</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Staff Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Staff Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Review instructor performance and schedules</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Lead Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Lead Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Track lead conversion and marketing effectiveness</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Custom Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Custom Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Create personalized reports for your business</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">Create Report</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-orange-900/20 border border-orange-700 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-300">
                Full reporting functionality coming soon. Reports will include detailed analytics, export options, and scheduled email reports.
              </p>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}