'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [facebookConnected, setFacebookConnected] = useState(false)

  useEffect(() => {
    const storedData = localStorage.getItem('atlas_fitness_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
    
    // Check Facebook connection status
    const fbConnected = localStorage.getItem('facebook_connected')
    setFacebookConnected(fbConnected === 'true')
  }, [])

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to Atlas Fitness!</h1>
          <p className="text-gray-300 mb-8">Please sign up to access your dashboard.</p>
          <Link 
            href="/signup"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    )
  }

  const trialEnds = new Date(userData.trialEnds)
  const daysLeft = Math.ceil((trialEnds.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              Atlas Fitness
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {userData.name}</span>
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
                {daysLeft} days left in trial
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-300">Welcome to your Atlas Fitness trial dashboard for {userData.organizationName}</p>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-2">🚀 Your Free Trial is Active!</h2>
          <p className="mb-4">
            Your 14-day free trial expires on {trialEnds.toLocaleDateString()}. 
            That's {daysLeft} days to experience the power of Atlas Fitness.
          </p>
          <button className="bg-white text-orange-500 font-bold py-2 px-4 rounded hover:bg-gray-100 transition-colors">
            Upgrade to Pro
          </button>
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
            {facebookConnected ? (
              <div>
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-400 text-sm">Connected</span>
                </div>
                <button 
                  onClick={() => router.push('/integrations/facebook')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Manage Connection
                </button>
              </div>
            ) : (
              <button 
                onClick={() => router.push('/integrations/facebook')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Connect Facebook
              </button>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📱 Setup WhatsApp</h3>
            <p className="text-gray-300 mb-4">
              Enable WhatsApp integration for instant lead communication.
            </p>
            <button 
              onClick={() => alert('WhatsApp integration coming soon! This feature will be available in the next update.')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Setup WhatsApp
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">🎯 Configure AI</h3>
            <p className="text-gray-300 mb-4">
              Customize your AI assistant's responses and qualification criteria.
            </p>
            <button 
              onClick={() => alert('AI Configuration coming soon! You\'ll be able to customize your AI assistant\'s responses and qualification criteria.')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Configure AI
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
              onClick={() => alert('Settings page coming soon! You\'ll be able to manage your account settings and preferences.')}
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
      </main>
    </div>
  )
}