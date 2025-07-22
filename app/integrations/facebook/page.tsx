'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFacebookConnection } from '@/app/hooks/useFacebookConnection'
import { useFacebookPages, useFacebookAdAccounts, useFacebookLeadForms, useFacebookLeads } from '@/app/hooks/useFacebookData'

export default function FacebookIntegrationPage() {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  
  const facebookConnection = useFacebookConnection()
  const { pages, loading: pagesLoading, error: pagesError, refetch: refetchPages } = useFacebookPages(facebookConnection.connected)
  const { adAccounts, loading: adAccountsLoading, error: adAccountsError, refetch: refetchAdAccounts } = useFacebookAdAccounts(facebookConnection.connected)
  const { leadForms, loading: leadFormsLoading, error: leadFormsError, refetch: refetchLeadForms } = useFacebookLeadForms(selectedPageId, facebookConnection.connected)
  const { leads, loading: leadsLoading, error: leadsError, refetch: refetchLeads } = useFacebookLeads(undefined, selectedPageId, facebookConnection.connected && !!selectedPageId)

  const handleConnect = () => {
    setConnecting(true)
    setError('')
    
    // Simple redirect to Facebook OAuth (you can customize this URL)
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
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
          {facebookConnection.loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-gray-300">Checking connection status...</span>
            </div>
          ) : facebookConnection.connected ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-green-400">Connected</span>
                </div>
                <span className="text-gray-400 text-sm">
                  {facebookConnection.connectedAt && 
                    `Connected on ${new Date(facebookConnection.connectedAt).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={facebookConnection.disconnect}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Disconnect
                </button>
                <button 
                  onClick={facebookConnection.refresh}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-300">Not Connected</span>
              </div>
              <span className="text-gray-400 text-sm">No Facebook account connected</span>
            </div>
          )}
          
          {/* Debug Info */}
          {facebookConnection.debug && (
            <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-400">
              <strong>Debug Info:</strong> Last checked: {facebookConnection.debug.lastChecked} | 
              Raw value: {facebookConnection.debug.rawValue || 'null'}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <h4 className="text-red-200 font-medium mb-2">Connection Error</h4>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Facebook Data Sections - Only show when connected */}
        {facebookConnection.connected && (
          <>
            {/* Facebook Pages Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Your Facebook Pages</h3>
                  <p className="text-gray-400 text-sm">Select the page that contains your lead forms</p>
                </div>
                <button 
                  onClick={refetchPages}
                  disabled={pagesLoading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                >
                  {pagesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {pagesError && (
                <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                  <p className="text-red-300 text-sm">Error: {pagesError}</p>
                </div>
              )}

              {pagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-gray-300">Loading your Facebook pages...</span>
                </div>
              ) : pages.length > 0 ? (
                <div className="grid gap-4">
                  {pages.map((page) => (
                    <div 
                      key={page.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPageId === page.id 
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      <div className="flex items-center space-x-4">
                        {page.cover && (
                          <img 
                            src={page.cover} 
                            alt={page.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{page.name}</h4>
                          <p className="text-gray-400 text-sm">{page.category}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{page.followers_count.toLocaleString()} followers</span>
                            <span className={`px-2 py-1 rounded ${page.hasLeadAccess ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                              {page.hasLeadAccess ? 'Lead Access ✓' : 'No Lead Access'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No Facebook pages found. Make sure you have admin access to at least one page.</p>
                </div>
              )}
            </div>

            {/* Ad Accounts Section */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold">Ad Accounts</h3>
                  <p className="text-gray-400 text-sm">Your connected advertising accounts</p>
                </div>
                <button 
                  onClick={refetchAdAccounts}
                  disabled={adAccountsLoading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                >
                  {adAccountsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {adAccountsError && (
                <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                  <p className="text-red-300 text-sm">Error: {adAccountsError}</p>
                </div>
              )}

              {adAccountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-gray-300">Loading your ad accounts...</span>
                </div>
              ) : adAccounts.length > 0 ? (
                <div className="grid gap-4">
                  {adAccounts.map((account) => (
                    <div key={account.id} className="border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{account.name}</h4>
                          <p className="text-gray-400 text-sm">{account.id}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          account.status_color === 'green' ? 'bg-green-800 text-green-200' :
                          account.status_color === 'red' ? 'bg-red-800 text-red-200' :
                          account.status_color === 'yellow' ? 'bg-yellow-800 text-yellow-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {account.status}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-400">Spent</p>
                          <p className="text-white">${account.amount_spent.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Balance</p>
                          <p className="text-white">${account.balance.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Currency</p>
                          <p className="text-white">{account.currency}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Funding</p>
                          <p className="text-white">{account.funding_source}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No ad accounts found. Make sure you have access to advertising accounts.</p>
                </div>
              )}
            </div>

            {/* Lead Forms Section */}
            {selectedPageId && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Lead Forms</h3>
                    <p className="text-gray-400 text-sm">Select forms to sync with your CRM</p>
                  </div>
                  <button 
                    onClick={refetchLeadForms}
                    disabled={leadFormsLoading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                  >
                    {leadFormsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {leadFormsError && (
                  <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                    <p className="text-red-300 text-sm">Error: {leadFormsError}</p>
                  </div>
                )}

                {leadFormsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-gray-300">Loading lead forms...</span>
                  </div>
                ) : leadForms.length > 0 ? (
                  <div className="grid gap-4">
                    {leadForms.map((form) => (
                      <div key={form.id} className="border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-white">{form.name}</h4>
                            <p className="text-gray-400 text-sm">{form.context_card.description}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            form.is_active ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {form.status}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Leads Collected</p>
                            <p className="text-white font-semibold">{form.leads_count}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Questions</p>
                            <p className="text-white">{form.questions_count} fields</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Created</p>
                            <p className="text-white">{new Date(form.created_time).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center">
                          <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm transition-colors">
                            Enable Sync
                          </button>
                          <button className="text-gray-400 hover:text-white text-sm transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No lead forms found for this page. Create lead forms in Facebook Ads Manager first.</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Leads Section */}
            {selectedPageId && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Recent Leads</h3>
                    <p className="text-gray-400 text-sm">Latest leads from your Facebook ads</p>
                  </div>
                  <button 
                    onClick={refetchLeads}
                    disabled={leadsLoading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-3 rounded text-sm transition-colors"
                  >
                    {leadsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {leadsError && (
                  <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
                    <p className="text-red-300 text-sm">Error: {leadsError}</p>
                  </div>
                )}

                {leadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-gray-300">Loading leads...</span>
                  </div>
                ) : leads.length > 0 ? (
                  <div className="space-y-4">
                    {leads.slice(0, 10).map((lead) => (
                      <div key={lead.id} className="border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-white">
                                {lead.processed_data.full_name || lead.processed_data.email || 'Unknown Lead'}
                              </h4>
                              <span className="text-xs text-gray-400">
                                {new Date(lead.created_time).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              {lead.processed_data.email && (
                                <p className="text-gray-300">
                                  📧 {lead.processed_data.email}
                                </p>
                              )}
                              {lead.processed_data.phone_number && (
                                <p className="text-gray-300">
                                  📞 {lead.processed_data.phone_number}
                                </p>
                              )}
                              {Object.entries(lead.processed_data).map(([key, value]) => {
                                if (!value || key === 'full_name' || key === 'email' || key === 'phone_number') return null
                                return (
                                  <p key={key} className="text-gray-400 text-xs">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                                  </p>
                                )
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              lead.is_organic ? 'bg-green-800 text-green-200' : 'bg-blue-800 text-blue-200'
                            }`}>
                              {lead.is_organic ? 'Organic' : 'Paid Ad'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-700 pt-3 mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
                            <div>
                              <span className="font-medium">Campaign:</span> {lead.campaign_name}
                            </div>
                            <div>
                              <span className="font-medium">Ad:</span> {lead.ad_name}
                            </div>
                            <div>
                              <span className="font-medium">Form:</span> {lead.form_id}
                            </div>
                            <div>
                              <span className="font-medium">Platform:</span> {lead.platform}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-xs transition-colors">
                            Contact
                          </button>
                          <button className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs transition-colors">
                            Add to CRM
                          </button>
                          <button className="text-gray-400 hover:text-white text-xs transition-colors">
                            View Full Details
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {leads.length > 10 && (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">
                          Showing 10 of {leads.length} leads.
                        </p>
                        <button className="text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors">
                          View All Leads →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No leads found for this page. Make sure your ads are running and generating leads.</p>
                    <p className="text-sm mt-2">
                      {facebookConnection.connected ? 
                        "Connected to Facebook, but no leads available yet." : 
                        "Connect to Facebook to see your leads."
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Connect Button - Only show when NOT connected */}
        {!facebookConnection.connected && (
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
        )}

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