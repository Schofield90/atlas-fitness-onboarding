'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  PlusIcon,
  FacebookIcon,
  InstagramIcon,
  EmailIcon,
  TrendingUpIcon,
  EyeIcon,
  TargetIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react'

// Mock data for campaigns
const mockCampaigns = [
  {
    id: 1,
    name: 'Summer Membership Drive',
    type: 'Facebook Ads',
    status: 'active',
    budget: 500,
    spent: 287.50,
    impressions: 12450,
    clicks: 342,
    leads: 23,
    conversions: 8,
    ctr: 2.75,
    cpc: 0.84,
    costPerLead: 12.5,
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  },
  {
    id: 2,
    name: 'New Year Motivation Email',
    type: 'Email',
    status: 'completed',
    recipients: 2456,
    opened: 1234,
    clicked: 234,
    unsubscribed: 12,
    bounced: 23,
    openRate: 50.2,
    clickRate: 9.5,
    unsubscribeRate: 0.5,
    startDate: '2024-12-28',
    endDate: '2025-01-05'
  },
  {
    id: 3,
    name: 'Instagram Fitness Challenge',
    type: 'Instagram',
    status: 'draft',
    reach: 0,
    engagement: 0,
    profileVisits: 0,
    websiteClicks: 0,
    startDate: '2025-02-01',
    endDate: '2025-02-28'
  }
]

const emailTemplates = [
  { id: 1, name: 'Welcome Series', description: 'Automated welcome sequence for new members' },
  { id: 2, name: 'Win-Back Campaign', description: 'Re-engage inactive members' },
  { id: 3, name: 'Membership Renewal', description: 'Encourage membership renewals' },
  { id: 4, name: 'Class Promotion', description: 'Promote new class offerings' }
]

export default function CampaignsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'analytics'>('overview')
  const [selectedCampaignType, setSelectedCampaignType] = useState<'facebook' | 'instagram' | 'email'>('facebook')
  const [campaigns, setCampaigns] = useState(mockCampaigns)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <DashboardLayout userData={null}>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500 text-white',
      paused: 'bg-yellow-500 text-black',
      completed: 'bg-blue-500 text-white',
      draft: 'bg-gray-500 text-white',
      failed: 'bg-red-500 text-white'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500 text-white'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Campaigns</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <TargetIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-white">
                {campaigns.reduce((sum, c) => sum + (c.leads || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">+12% from last month</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Spend</p>
              <p className="text-2xl font-bold text-white">
                £{campaigns.reduce((sum, c) => sum + (c.spent || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg. Cost/Lead</p>
              <p className="text-2xl font-bold text-white">
                £{(campaigns.reduce((sum, c) => sum + (c.costPerLead || 0), 0) / campaigns.filter(c => c.costPerLead).length || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Campaigns</h2>
          <button
            onClick={() => setActiveTab('create')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Campaign
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Campaign</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Performance</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Budget</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">{campaign.name}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {campaign.type === 'Facebook Ads' && <div className="w-4 h-4 bg-blue-600 rounded"></div>}
                      {campaign.type === 'Email' && <div className="w-4 h-4 bg-green-600 rounded"></div>}
                      {campaign.type === 'Instagram' && <div className="w-4 h-4 bg-pink-600 rounded"></div>}
                      <span className="text-gray-300">{campaign.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(campaign.status)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {campaign.type === 'Facebook Ads' && (
                        <>
                          <div className="text-white">{campaign.leads} leads</div>
                          <div className="text-gray-400">{campaign.clicks} clicks</div>
                        </>
                      )}
                      {campaign.type === 'Email' && (
                        <>
                          <div className="text-white">{campaign.openRate}% opened</div>
                          <div className="text-gray-400">{campaign.clickRate}% clicked</div>
                        </>
                      )}
                      {campaign.type === 'Instagram' && (
                        <>
                          <div className="text-white">{campaign.reach} reach</div>
                          <div className="text-gray-400">{campaign.engagement} engagement</div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {campaign.budget && (
                      <div className="text-sm">
                        <div className="text-white">£{campaign.spent}/{campaign.budget}</div>
                        <div className="w-20 bg-gray-600 rounded-full h-2 mt-1">
                          <div 
                            className="bg-orange-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {campaign.recipients && (
                      <div className="text-sm">
                        <div className="text-white">{campaign.recipients} sent</div>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderCreateCampaign = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Create New Campaign</h2>
        
        {/* Campaign Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Type</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedCampaignType('facebook')}
              className={`p-4 rounded-lg border-2 ${selectedCampaignType === 'facebook' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-600 hover:border-gray-500'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Facebook & Instagram Ads</div>
                  <div className="text-sm text-gray-400">Reach targeted audiences with compelling ads</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCampaignType('email')}
              className={`p-4 rounded-lg border-2 ${selectedCampaignType === 'email' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-600 hover:border-gray-500'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Email Marketing</div>
                  <div className="text-sm text-gray-400">Send targeted emails to your contact list</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCampaignType('instagram')}
              className={`p-4 rounded-lg border-2 ${selectedCampaignType === 'instagram' 
                ? 'border-pink-500 bg-pink-500/10' 
                : 'border-gray-600 hover:border-gray-500'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">Instagram Content</div>
                  <div className="text-sm text-gray-400">Create engaging posts and stories</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Campaign Form */}
        {selectedCampaignType === 'facebook' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g., Summer Membership Drive"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Daily Budget (£)</label>
                <input
                  type="number"
                  placeholder="25.00"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Duration</label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>Ongoing</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
              <textarea
                placeholder="Describe your ideal customer (age, interests, location, etc.)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Ad Creative</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-400">Upload images or videos for your ad</p>
                <button className="mt-2 text-orange-500 hover:text-orange-400">Browse Files</button>
              </div>
            </div>
          </div>
        )}

        {selectedCampaignType === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g., New Year Motivation Email"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Template</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option>Select a template</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">All contacts</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Active members only</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Inactive members (win-back)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Prospects (leads)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Send Schedule</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option>Send immediately</option>
                    <option>Schedule for later</option>
                  </select>
                </div>
                <div>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedCampaignType === 'instagram' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Post Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Feed Post</div>
                  </div>
                </button>
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Story</div>
                  </div>
                </button>
                <button className="p-4 border border-gray-600 rounded-lg hover:border-gray-500">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2"></div>
                    <div className="font-medium text-white">Reel</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Caption</label>
              <textarea
                placeholder="Write your Instagram caption..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Hashtags</label>
              <input
                type="text"
                placeholder="#fitness #gym #workout #motivation"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6">
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg">
            Create Campaign
          </button>
          <button 
            onClick={() => setActiveTab('overview')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Marketing Analytics</h2>
        
        {/* Coming Soon Notice */}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUpIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            We're building comprehensive analytics including email open rates, click tracking, 
            Facebook pixel integration, and detailed ROI reporting.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketing & Campaigns</h1>
          <p className="text-gray-400">Manage your Facebook, Instagram, and email marketing campaigns</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Campaign Overview
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Create Campaign
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Analytics & Reports
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'create' && renderCreateCampaign()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </DashboardLayout>
  )
}