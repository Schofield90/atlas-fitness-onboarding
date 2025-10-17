'use client'

import { useState, useEffect } from 'react'
import { SaasPlan, PlanFeatures, PlanLimits, FEATURE_CATEGORIES } from '@/app/lib/types/plans'
import { 
  Check, 
  X, 
  Star, 
  Info, 
  Eye,
  EyeOff,
  Download,
  Filter,
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  Settings,
  DollarSign
} from 'lucide-react'

interface FeatureComparison {
  key: string
  name: string
  description?: string
  category: string
  type: 'boolean' | 'number' | 'limit'
  values: {
    [planId: string]: boolean | number | string
  }
  isHighlight: boolean
}

export default function PlanComparison() {
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [features, setFeatures] = useState<FeatureComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showLimits, setShowLimits] = useState(true)
  const [showFeatures, setShowFeatures] = useState(true)
  const [highlightOnly, setHighlightOnly] = useState(false)

  useEffect(() => {
    loadPlansAndGenerateComparison()
  }, [])

  const loadPlansAndGenerateComparison = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/saas-admin/plans?active=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans')
      }

      const activePlans = data.plans.sort((a: SaasPlan, b: SaasPlan) => a.sort_order - b.sort_order)
      setPlans(activePlans)
      
      generateFeatureComparison(activePlans)
      
    } catch (error: any) {
      console.error('Error loading plans:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateFeatureComparison = (plans: SaasPlan[]) => {
    const comparisonFeatures: FeatureComparison[] = []

    // Define feature mappings with better names and descriptions
    const featureDefinitions = {
      // Core Features
      staff_accounts: { name: 'Staff Accounts', category: 'Core', type: 'number' as const, description: 'Number of staff members who can access the system' },
      monthly_bookings: { name: 'Monthly Bookings', category: 'Core', type: 'number' as const, description: 'Maximum bookings per month' },
      max_classes_per_month: { name: 'Classes Per Month', category: 'Core', type: 'number' as const, description: 'Maximum classes that can be scheduled per month' },
      class_waitlists: { name: 'Class Waitlists', category: 'Core', type: 'boolean' as const, description: 'Allow customers to join waitlists for fully booked classes' },
      recurring_bookings: { name: 'Recurring Bookings', category: 'Core', type: 'boolean' as const, description: 'Enable recurring class bookings and memberships' },
      
      // Communication
      sms_credits: { name: 'SMS Credits', category: 'Communication', type: 'number' as const, description: 'Monthly SMS message credits included' },
      email_credits: { name: 'Email Credits', category: 'Communication', type: 'number' as const, description: 'Monthly email credits included' },
      whatsapp_credits: { name: 'WhatsApp Credits', category: 'Communication', type: 'number' as const, description: 'Monthly WhatsApp message credits' },
      voice_calls: { name: 'Voice Calls', category: 'Communication', type: 'boolean' as const, description: 'Make voice calls to customers directly from the platform' },
      
      // Automation
      custom_forms: { name: 'Custom Forms', category: 'Automation', type: 'number' as const, description: 'Number of custom forms you can create' },
      automation_workflows: { name: 'Automation Workflows', category: 'Automation', type: 'number' as const, description: 'Number of automated workflows you can set up' },
      advanced_triggers: { name: 'Advanced Triggers', category: 'Automation', type: 'boolean' as const, description: 'Advanced event triggers for workflows' },
      conditional_logic: { name: 'Conditional Logic', category: 'Automation', type: 'boolean' as const, description: 'If-then logic in forms and workflows' },
      
      // Integrations
      api_access: { name: 'API Access', category: 'Integrations', type: 'boolean' as const, description: 'Access to REST API for custom integrations' },
      facebook_leads: { name: 'Facebook Lead Ads', category: 'Integrations', type: 'boolean' as const, description: 'Automatic import of Facebook Lead Ad forms' },
      google_calendar: { name: 'Google Calendar', category: 'Integrations', type: 'boolean' as const, description: 'Two-way sync with Google Calendar' },
      zapier_integration: { name: 'Zapier Integration', category: 'Integrations', type: 'boolean' as const, description: 'Connect with 5000+ apps via Zapier' },
      webhook_endpoints: { name: 'Webhook Endpoints', category: 'Integrations', type: 'number' as const, description: 'Number of webhook endpoints for real-time data' },
      
      // Branding
      white_label: { name: 'White Label', category: 'Branding', type: 'boolean' as const, description: 'Remove Atlas branding and use your own', isHighlight: true },
      custom_domain: { name: 'Custom Domain', category: 'Branding', type: 'boolean' as const, description: 'Use your own domain for customer-facing pages' },
      custom_branding: { name: 'Custom Branding', category: 'Branding', type: 'boolean' as const, description: 'Customize colors, logos, and branding' },
      remove_atlas_branding: { name: 'Remove Atlas Branding', category: 'Branding', type: 'boolean' as const, description: 'Completely remove Atlas branding from all pages' },
      
      // Advanced
      multi_location: { name: 'Multi-Location', category: 'Advanced', type: 'boolean' as const, description: 'Manage multiple gym locations from one account', isHighlight: true },
      staff_permissions: { name: 'Staff Permissions', category: 'Advanced', type: 'boolean' as const, description: 'Granular permissions for different staff roles' },
      reporting_analytics: { name: 'Advanced Analytics', category: 'Advanced', type: 'boolean' as const, description: 'Detailed reporting and analytics dashboard' },
      data_export: { name: 'Data Export', category: 'Advanced', type: 'boolean' as const, description: 'Export customer and business data' },
      custom_fields: { name: 'Custom Fields', category: 'Advanced', type: 'boolean' as const, description: 'Add custom fields to customer profiles' },
      
      // AI Features
      ai_chat_responses: { name: 'AI Chat Responses', category: 'AI', type: 'boolean' as const, description: 'AI-powered responses to customer inquiries', isHighlight: true },
      ai_lead_scoring: { name: 'AI Lead Scoring', category: 'AI', type: 'boolean' as const, description: 'Automatically score and prioritize leads' },
      ai_insights: { name: 'AI Business Insights', category: 'AI', type: 'boolean' as const, description: 'AI-generated insights about your business performance' },
      ai_recommendations: { name: 'AI Recommendations', category: 'AI', type: 'boolean' as const, description: 'Personalized recommendations for customers' }
    }

    // Add features
    Object.entries(featureDefinitions).forEach(([key, config]) => {
      const values: { [planId: string]: boolean | number | string } = {}
      
      plans.forEach(plan => {
        const value = (plan.features as any)[key]
        if (config.type === 'number') {
          values[plan.id] = value === -1 ? 'Unlimited' : (value || 0)
        } else {
          values[plan.id] = Boolean(value)
        }
      })

      comparisonFeatures.push({
        key,
        name: config.name,
        description: config.description,
        category: config.category,
        type: config.type,
        values,
        isHighlight: config.isHighlight || false
      })
    })

    // Add limits
    const limitDefinitions = {
      max_customers: { name: 'Max Customers', category: 'Limits', type: 'limit' as const, description: 'Maximum number of customers you can have' },
      max_leads_per_month: { name: 'Max Leads Per Month', category: 'Limits', type: 'limit' as const, description: 'Maximum leads you can capture per month' },
      storage_gb: { name: 'Storage Space', category: 'Limits', type: 'limit' as const, description: 'File storage space in GB' },
      sms_per_month: { name: 'SMS Per Month', category: 'Limits', type: 'limit' as const, description: 'Maximum SMS messages per month' },
      emails_per_month: { name: 'Emails Per Month', category: 'Limits', type: 'limit' as const, description: 'Maximum emails you can send per month' },
      api_calls_per_month: { name: 'API Calls Per Month', category: 'Limits', type: 'limit' as const, description: 'Maximum API calls per month' },
      data_retention_months: { name: 'Data Retention', category: 'Limits', type: 'limit' as const, description: 'How long data is retained (months)' }
    }

    Object.entries(limitDefinitions).forEach(([key, config]) => {
      const values: { [planId: string]: boolean | number | string } = {}
      
      plans.forEach(plan => {
        const value = (plan.limits as any)[key]
        if (value === -1) {
          values[plan.id] = 'Unlimited'
        } else if (key === 'storage_gb') {
          values[plan.id] = `${value || 0} GB`
        } else if (key === 'data_retention_months') {
          values[plan.id] = `${value || 0} months`
        } else {
          values[plan.id] = (value || 0).toLocaleString()
        }
      })

      comparisonFeatures.push({
        key,
        name: config.name,
        description: config.description,
        category: config.category,
        type: config.type,
        values,
        isHighlight: false
      })
    })

    setFeatures(comparisonFeatures)
  }

  const formatPrice = (priceInPence: number) => {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  const getPlanColor = (plan: SaasPlan) => {
    const colors = {
      starter: 'border-blue-500 bg-blue-500/5',
      professional: 'border-purple-500 bg-purple-500/5',
      enterprise: 'border-orange-500 bg-orange-500/5',
      custom: 'border-gray-500 bg-gray-500/5'
    }
    return colors[plan.tier] || colors.custom
  }

  const getFilteredFeatures = () => {
    let filtered = features

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory)
    }

    // Filter by type
    if (!showFeatures) {
      filtered = filtered.filter(f => f.type === 'limit')
    }
    if (!showLimits) {
      filtered = filtered.filter(f => f.type !== 'limit')
    }

    // Filter highlights only
    if (highlightOnly) {
      filtered = filtered.filter(f => f.isHighlight)
    }

    return filtered
  }

  const exportComparison = () => {
    // This would typically generate a CSV or PDF
    const csvContent = generateCSV()
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plan-comparison.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const generateCSV = () => {
    const headers = ['Feature', 'Category', ...plans.map(p => p.name)]
    const rows = getFilteredFeatures().map(feature => [
      feature.name,
      feature.category,
      ...plans.map(plan => feature.values[plan.id]?.toString() || 'N/A')
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading plan comparison...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  const filteredFeatures = getFilteredFeatures()
  const categories = Array.from(new Set(features.map(f => f.category)))

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Plan Comparison</h1>
            <p className="text-sm text-gray-400">Compare features and limits across all plans</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={exportComparison}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-300">Filters:</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFeatures}
                onChange={(e) => setShowFeatures(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              Show Features
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showLimits}
                onChange={(e) => setShowLimits(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              Show Limits
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={highlightOnly}
                onChange={(e) => setHighlightOnly(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              Highlights Only
            </label>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-gray-800 rounded-lg p-6 border-2 ${getPlanColor(plan)}`}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {plan.is_popular && (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatPrice(plan.price_monthly)}
                  </div>
                  <div className="text-sm text-gray-400">per month</div>
                  <div className="text-sm text-gray-500">
                    {formatPrice(plan.price_yearly)} /year
                  </div>
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                )}

                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {Object.values(plan.features).filter(Boolean).length} features
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {Object.keys(plan.limits).length} limits
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        {plans.length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                          <span>{plan.name}</span>
                          {plan.is_popular && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current mt-1" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredFeatures.length === 0 ? (
                    <tr>
                      <td colSpan={plans.length + 1} className="px-6 py-8 text-center text-gray-400">
                        No features match your current filters
                      </td>
                    </tr>
                  ) : (
                    filteredFeatures.map((feature) => (
                      <tr 
                        key={feature.key} 
                        className={`hover:bg-gray-700/50 ${feature.isHighlight ? 'bg-purple-900/20' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  {feature.name}
                                </span>
                                {feature.isHighlight && (
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                )}
                              </div>
                              {feature.description && (
                                <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
                              )}
                              <span className="inline-block px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300 mt-1">
                                {feature.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        {plans.map((plan) => (
                          <td key={`${feature.key}-${plan.id}`} className="px-6 py-4 text-center">
                            {feature.type === 'boolean' ? (
                              feature.values[plan.id] ? (
                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-red-500 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm text-white font-medium">
                                {feature.values[plan.id]}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-gray-300">Feature included</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-gray-300">Feature not included</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-gray-300">Popular plan or highlighted feature</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-purple-900/20 rounded border border-purple-700"></span>
              <span className="text-gray-300">Key differentiator</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}