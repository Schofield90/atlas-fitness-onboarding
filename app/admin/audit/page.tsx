'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  // Mock audit log data for placeholder
  const mockLogs = [
    {
      id: 1,
      action: 'User Login',
      user: 'admin@example.com',
      timestamp: '2024-01-15 10:30:00',
      status: 'success',
      details: 'Successful login from IP 192.168.1.1'
    },
    {
      id: 2,
      action: 'Organization Created',
      user: 'admin@example.com',
      timestamp: '2024-01-15 09:15:00',
      status: 'success',
      details: 'New organization "Gym Alpha" created'
    },
    {
      id: 3,
      action: 'Failed Login Attempt',
      user: 'suspicious@example.com',
      timestamp: '2024-01-15 08:45:00',
      status: 'warning',
      details: 'Multiple failed login attempts from IP 10.0.0.1'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            Success
          </span>
        )
      case 'warning':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
            Warning
          </span>
        )
      case 'error':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
            Error
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">
            Info
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Audit Logs</h1>
            <p className="text-sm text-gray-400">System activity and security audit trail</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-6">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {mockLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      {getStatusBadge(log.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">
                        {log.action}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {log.user}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="px-6 py-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing placeholder audit logs. Real data will be populated from the audit system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}