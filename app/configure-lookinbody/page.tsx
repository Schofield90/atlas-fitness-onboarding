'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Info } from 'lucide-react'

export default function ConfigureLookInBodyPage() {
  const [organizationId, setOrganizationId] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganizationId()
  }, [])

  const fetchOrganizationId = async () => {
    try {
      const response = await fetch('/api/organization/current')
      if (response.ok) {
        const data = await response.json()
        setOrganizationId(data.organizationId || '')
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    } finally {
      setLoading(false)
    }
  }

  const webhookUrl = organizationId 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/webhooks/lookinbody/${organizationId}`
    : ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Configure LookInBody Webhook</h1>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">What is LookInBody?</p>
                  <p>LookInBody integrates with InBody body composition scanners to automatically sync member health data, track progress, and generate automated health alerts.</p>
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Your Webhook URL</h2>
              
              {organizationId ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-gray-800 break-all flex-1">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={copyToClipboard}
                        className="ml-4 p-2 text-gray-500 hover:text-gray-700 transition"
                      >
                        {copied ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Copy this URL and add it to your LookInBody Web dashboard webhook settings.
                  </p>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No organization found. Please ensure you're logged in and have created an organization.
                  </p>
                </div>
              )}
            </div>

            {/* Setup Instructions */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Setup Instructions</h2>
              
              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600">
                <li>
                  <span className="font-medium">Log in to LookInBody Web</span>
                  <p className="ml-6 mt-1 text-gray-500">
                    Access your LookInBody Web dashboard at{' '}
                    <a 
                      href="https://lookinbody.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      lookinbody.com
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </p>
                </li>
                
                <li>
                  <span className="font-medium">Navigate to Settings → Webhooks</span>
                  <p className="ml-6 mt-1 text-gray-500">
                    Find the webhook configuration section in your account settings
                  </p>
                </li>
                
                <li>
                  <span className="font-medium">Add New Webhook</span>
                  <p className="ml-6 mt-1 text-gray-500">
                    Click "Add Webhook" or "New Webhook Endpoint"
                  </p>
                </li>
                
                <li>
                  <span className="font-medium">Configure Webhook</span>
                  <div className="ml-6 mt-1 space-y-2 text-gray-500">
                    <p>Enter the following details:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>URL:</strong> Paste the webhook URL from above</li>
                      <li><strong>Events:</strong> Select "All Events" or specifically "Scan Completed"</li>
                      <li><strong>Format:</strong> JSON</li>
                      <li><strong>Method:</strong> POST</li>
                    </ul>
                  </div>
                </li>
                
                <li>
                  <span className="font-medium">Save and Test</span>
                  <p className="ml-6 mt-1 text-gray-500">
                    Save the webhook and use the "Test" button to verify it's working
                  </p>
                </li>
              </ol>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">What Happens Next?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Automatic Data Sync</h3>
                  <p className="text-sm text-gray-600">
                    When members complete InBody scans, their data automatically syncs to their profile
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Health Alerts</h3>
                  <p className="text-sm text-gray-600">
                    Get notified of significant changes in body composition requiring attention
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Progress Tracking</h3>
                  <p className="text-sm text-gray-600">
                    View historical data and trends for each member's fitness journey
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Automated Workflows</h3>
                  <p className="text-sm text-gray-600">
                    Trigger automated messages or tasks based on scan results
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Need Help?</h3>
              <p className="text-sm text-gray-600">
                If you encounter any issues setting up the webhook or need assistance with LookInBody integration, 
                please contact support or refer to the integration documentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}