'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function FacebookIntegrationPage() {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = () => {
    setConnecting(true)
    setError('')
    
    // Simple redirect to Facebook OAuth (you can customize this URL)
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'your_facebook_app_id'
    const redirectUri = `${window.location.origin}/integrations/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval,ads_management'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=atlas_fitness_oauth`
    
    window.location.href = oauthUrl
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              Atlas Fitness
            </Link>
            <Link 
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🔗 Connect Facebook Ads</h1>
          <p className="text-gray-300 text-lg">
            Connect your Facebook ad account to automatically capture and manage leads from your Facebook advertising campaigns.
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">What you'll get:</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Automatic lead capture from Facebook Lead Ads
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Real-time lead notifications and follow-up
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Lead qualification and scoring
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-3">✓</span>
              Integration with your CRM and communication tools
            </li>
          </ul>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Connection Status</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
              <span className="text-gray-300">Not Connected</span>
            </div>
            <span className="text-gray-400 text-sm">No Facebook account connected</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <h4 className="text-red-200 font-medium mb-2">Connection Error</h4>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Connect Button */}
        <div className="text-center">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {connecting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Connecting to Facebook...
              </div>
            ) : (
              'Connect Facebook Account'
            )}
          </button>
          
          <p className="text-gray-400 text-sm mt-4">
            You'll be redirected to Facebook to authorize the connection. 
            This is secure and you can revoke access anytime.
          </p>
        </div>

        {/* Setup Requirements */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold mb-4">Setup Requirements</h3>
          <div className="space-y-3 text-gray-300 text-sm">
            <p>
              <strong>Note:</strong> To use this integration, you'll need:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>A Facebook Business account</li>
              <li>Facebook Pages with lead forms</li>
              <li>Admin access to your Facebook ad accounts</li>
            </ul>
            <p className="text-orange-400 mt-4">
              💡 <strong>Tip:</strong> If you haven't set up your Facebook app yet, you'll need to configure it first. 
              The integration requires proper Facebook App ID and permissions.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}