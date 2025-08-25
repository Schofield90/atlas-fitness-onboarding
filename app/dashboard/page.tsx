'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFacebookConnection } from '@/app/hooks/useFacebookConnection'
import DashboardLayout from '@/app/components/DashboardLayout'

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [systemMode, setSystemMode] = useState<string>('crm')
  const facebookConnection = useFacebookConnection()

  useEffect(() => {
    setMounted(true)
    
    // Check system mode
    const savedMode = localStorage.getItem('systemMode')
    if (savedMode) {
      setSystemMode(savedMode)
      // If in booking mode, redirect to overview dashboard
      if (savedMode === 'booking') {
        router.push('/dashboard/overview')
        return
      }
    }
    
    // Check for stored data
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    } else {
      // Create default data only on client side
      const defaultData = {
        organizationName: 'Atlas Fitness',
        gymName: 'Atlas Fitness',
        email: 'samschofield90@hotmail.co.uk',
        trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
      }
      localStorage.setItem('gymleadhub_trial_data', JSON.stringify(defaultData))
      setUserData(defaultData)
    }
  }, [])
  
  if (!mounted || !userData) {
    return (
      <DashboardLayout userData={null}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h1 className="text-xl font-medium text-gray-400">Loading dashboard...</h1>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const trialEnds = new Date(userData.trialEnds)
  const daysLeft = Math.ceil((trialEnds.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-300">Welcome to your Atlas Fitness trial dashboard for {userData.organizationName}</p>
            </div>
            <Link 
              href="/dashboard/overview" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Analytics Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-2">🚀 Your Free Trial is Active!</h2>
          <p className="mb-4">
            Your 14-day free trial expires on {mounted ? trialEnds.toLocaleDateString('en-GB') : '...'}. 
            That's {daysLeft} days to experience the power of Atlas Fitness.
          </p>
          <Link 
            href="/billing" 
            className="inline-block bg-white text-orange-500 font-bold py-2 px-4 rounded hover:bg-gray-100 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Total Leads</h3>
            <div className="text-3xl font-bold text-orange-500">0</div>
            <p className="text-gray-400 text-sm">Connect your ads to see leads</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Response Time</h3>
            <div className="text-3xl font-bold text-green-500">30s</div>
            <p className="text-gray-400 text-sm">AI-powered instant response</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
            <div className="text-3xl font-bold text-blue-500">0%</div>
            <p className="text-gray-400 text-sm">Track your conversion rate</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Active Campaigns</h3>
            <div className="text-3xl font-bold text-purple-500">0</div>
            <p className="text-gray-400 text-sm">Set up your first campaign</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">🔗 Connect Facebook Ads</h3>
            <p className="text-gray-300 mb-4">
              Connect your Facebook ad account to start capturing leads automatically.
            </p>
            {facebookConnection.loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-gray-400 text-sm">Checking connection...</span>
              </div>
            ) : facebookConnection.connected ? (
              <div>
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-400 text-sm">
                    Connected {mounted && facebookConnection.connectedAt && 
                      `(${new Date(facebookConnection.connectedAt).toLocaleDateString('en-GB')})`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push('/integrations/facebook')}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Manage Connection
                  </button>
                  <button 
                    onClick={facebookConnection.disconnect}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {facebookConnection.error && (
                  <div className="text-red-400 text-xs mb-2">
                    Error: {facebookConnection.error}
                  </div>
                )}
                <button 
                  onClick={() => router.push('/integrations/facebook')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Connect Facebook
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📱 WhatsApp Integration</h3>
            <p className="text-gray-300 mb-4">
              Automated booking confirmations and class reminders via WhatsApp.
            </p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-400 text-sm">Connected</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => router.push('/integrations/whatsapp')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Manage
              </button>
              <button 
                onClick={() => router.push('/test-whatsapp')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Send Test
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">🎯 Configure AI</h3>
            <p className="text-gray-300 mb-4">
              Customize your AI assistant's responses and qualification criteria.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => router.push('/ai-config')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Configure AI
              </button>
              <button 
                onClick={() => router.push('/ai-training')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Train Responses
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📝 Lead Forms</h3>
            <p className="text-gray-300 mb-4">
              Create embeddable forms to capture leads from any website.
            </p>
            <button 
              onClick={() => router.push('/lead-forms')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Manage Forms
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📊 View Analytics</h3>
            <p className="text-gray-300 mb-4">
              Get detailed insights into your lead generation performance.
            </p>
            <button 
              onClick={() => alert('Analytics dashboard coming soon! You\'ll get detailed insights into your lead generation performance.')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              View Analytics
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">⚙️ Settings</h3>
            <p className="text-gray-300 mb-4">
              Manage your account settings and preferences.
            </p>
            <button 
              onClick={() => router.push('/settings')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Open Settings
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">💬 Get Support</h3>
            <p className="text-gray-300 mb-4">
              Need help? Our support team is here to assist you.
            </p>
            <button 
              onClick={() => alert('📧 Support Contact:\n\nEmail: support@atlasfitness.com\nPhone: 1-800-ATLAS-FIT\n\nOur support team is available Monday-Friday, 9AM-6PM EST.')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold mb-4">🚀 Getting Started Checklist</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-gray-300">Create your Atlas Fitness account</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">1</span>
              </div>
              <span className="text-gray-300">Connect your Facebook ad account</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">2</span>
              </div>
              <span className="text-gray-300">Setup WhatsApp integration</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">3</span>
              </div>
              <span className="text-gray-300">Configure your AI assistant</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-xs">4</span>
              </div>
              <span className="text-gray-300">Test your first lead capture</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}