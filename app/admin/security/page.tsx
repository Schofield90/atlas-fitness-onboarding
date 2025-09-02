'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle,
  Settings,
  Users,
  Database,
  Globe,
  Bell
} from 'lucide-react'

export default function SecurityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'authentication', label: 'Authentication', icon: Lock },
    { id: 'permissions', label: 'Permissions', icon: Users },
    { id: 'api', label: 'API Security', icon: Key },
    { id: 'monitoring', label: 'Monitoring', icon: Bell }
  ]

  const SecurityOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">System Status</h3>
              <p className="text-sm text-green-400">Secure</p>
            </div>
          </div>
          <p className="text-gray-400">All security systems operational</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Alerts</h3>
              <p className="text-sm text-yellow-400">0 Active</p>
            </div>
          </div>
          <p className="text-gray-400">No security alerts detected</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Data Protection</h3>
              <p className="text-sm text-purple-400">Enabled</p>
            </div>
          </div>
          <p className="text-gray-400">Encryption and backup active</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Security Checklist</h3>
        <div className="space-y-3">
          {[
            'SSL/TLS certificates configured',
            'Database encryption enabled',
            'API rate limiting active',
            'User authentication configured',
            'Audit logging enabled'
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SecurityOverview />
      case 'authentication':
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Authentication Settings</h3>
            <p className="text-gray-400">Configure authentication policies, password requirements, and multi-factor authentication settings.</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium">Multi-Factor Authentication</h4>
                  <p className="text-sm text-gray-400">Require MFA for admin accounts</p>
                </div>
                <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
                  Configure
                </button>
              </div>
            </div>
          </div>
        )
      case 'permissions':
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Permission Management</h3>
            <p className="text-gray-400">Manage user roles, permissions, and access controls across the platform.</p>
          </div>
        )
      case 'api':
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">API Security</h3>
            <p className="text-gray-400">Configure API keys, rate limiting, and access controls for external integrations.</p>
          </div>
        )
      case 'monitoring':
        return (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Security Monitoring</h3>
            <p className="text-gray-400">Monitor security events, configure alerts, and review access patterns.</p>
          </div>
        )
      default:
        return <SecurityOverview />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Security Settings</h1>
            <p className="text-sm text-gray-400">Manage platform security and access controls</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  )
}