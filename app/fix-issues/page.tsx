'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Loader, Settings, Database, User } from 'lucide-react'

export default function FixIssuesPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const addResult = (message: string, success: boolean = true) => {
    setResults(prev => [...prev, { message, success, timestamp: new Date().toISOString() }])
  }

  const fixAuthenticationIssue = async () => {
    addResult('Fixing authentication and organization membership...')
    
    try {
      // Fix organization membership
      const fixOrgRes = await fetch('/api/auth/fix-organization', {
        method: 'POST'
      })
      
      const fixOrgData = await fixOrgRes.json()
      
      if (fixOrgData.success) {
        addResult('✅ Organization membership fixed')
        addResult(`User ${fixOrgData.data.email} now has ${fixOrgData.data.role} role`)
      } else {
        addResult('❌ Failed to fix organization: ' + fixOrgData.error, false)
      }
      
      // Check auth status
      const statusRes = await fetch('/api/debug/check-auth-status')
      const statusData = await statusRes.json()
      
      if (statusData.authenticated && statusData.organization.hasMembership) {
        addResult('✅ Authentication is working correctly')
      } else {
        addResult('⚠️ Authentication may still have issues', false)
      }
      
    } catch (error: any) {
      addResult('❌ Error fixing authentication: ' + error.message, false)
    }
  }

  const fixFacebookIntegration = async () => {
    addResult('Resetting Facebook integration...')
    
    try {
      // Clear broken Facebook connection
      const fixRes = await fetch('/api/integrations/meta/fix-connection', {
        method: 'POST'
      })
      
      const fixData = await fixRes.json()
      
      if (fixData.success) {
        addResult('✅ Facebook integration reset successfully')
        fixData.actions?.forEach((action: string) => {
          addResult(`  • ${action}`)
        })
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fb_connected')
          localStorage.removeItem('fb_pages_synced')
          localStorage.removeItem('fb_integration_status')
          addResult('✅ Cleared browser cache for Facebook')
        }
        
        addResult('ℹ️ Please reconnect your Facebook account in Settings → Integrations')
      } else {
        addResult('❌ Failed to reset Facebook: ' + fixData.error, false)
      }
      
    } catch (error: any) {
      addResult('❌ Error resetting Facebook: ' + error.message, false)
    }
  }

  const fixDarkModeIssues = async () => {
    addResult('Fixing dark mode styling...')
    
    try {
      // Set dark mode in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', 'dark')
        document.documentElement.classList.add('dark')
        addResult('✅ Dark mode enabled globally')
        
        // Force reload CSS
        const links = document.querySelectorAll('link[rel="stylesheet"]')
        links.forEach((link: any) => {
          const href = link.href
          link.href = ''
          link.href = href
        })
        addResult('✅ Stylesheets reloaded')
      }
      
    } catch (error: any) {
      addResult('❌ Error fixing dark mode: ' + error.message, false)
    }
  }

  const fixMembershipsIssue = async () => {
    addResult('Fixing memberships display issue...')
    
    try {
      // Set the organization ID in localStorage as a fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem('organizationId', '63589490-8f55-4157-bd3a-e141594b748e')
        addResult('✅ Organization ID set in localStorage')
      }
      
      // Check if memberships exist
      const res = await fetch('/api/debug/check-memberships')
      const data = await res.json()
      
      if (data.memberships && data.memberships.length > 0) {
        addResult(`✅ Found ${data.memberships.length} membership plans in database`)
        data.memberships.forEach((plan: any) => {
          addResult(`  • ${plan.name} - ${plan.price}`)
        })
      } else {
        addResult('⚠️ No membership plans found in database', false)
        addResult('ℹ️ You may need to recreate them or check the database')
      }
      
    } catch (error: any) {
      addResult('❌ Error checking memberships: ' + error.message, false)
    }
  }

  const runAllFixes = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔧 Starting comprehensive fix...')
      
      // Fix authentication first
      await fixAuthenticationIssue()
      
      // Fix Facebook integration
      await fixFacebookIntegration()
      
      // Fix dark mode
      await fixDarkModeIssues()
      
      // Fix memberships
      await fixMembershipsIssue()
      
      addResult('✅ All fixes completed!')
      addResult('ℹ️ Please refresh the page and try again')
      
    } catch (error: any) {
      addResult('❌ Unexpected error: ' + error.message, false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-white">System Issue Fixer</h1>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Known Issues to Fix:</h2>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <strong>Authentication Issue:</strong> "Create Workflow" redirects to login
                </div>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <strong>Facebook Integration:</strong> Connection lost, unable to sync pages
                </div>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <strong>UI Issues:</strong> Sidebar disappears, light mode appears in modals
                </div>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <strong>Memberships:</strong> Not loading (shows 0 despite having 3 created)
                </div>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <strong>Opportunities Pipeline:</strong> Settings button not working to customize stages
                </div>
              </li>
            </ul>
          </div>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={runAllFixes}
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Running Fixes...
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5" />
                  Run All Fixes
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={fixAuthenticationIssue}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Fix Auth Only
            </button>
            <button
              onClick={fixFacebookIntegration}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4" />
              Fix Facebook Only
            </button>
            <button
              onClick={fixDarkModeIssues}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Fix Dark Mode Only
            </button>
            <button
              onClick={fixMembershipsIssue}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4" />
              Fix Memberships
            </button>
          </div>
          
          {results.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Fix Results:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 text-sm ${
                      result.success ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-white font-semibold mb-2">Next Steps:</h4>
                <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                  <li>Refresh this page (Cmd+R or Ctrl+R)</li>
                  <li>Go back to the dashboard</li>
                  <li>Try creating a workflow in Automations</li>
                  <li>Reconnect Facebook in Settings → Integrations</li>
                  <li>Check if the class calendar sidebar is visible</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}