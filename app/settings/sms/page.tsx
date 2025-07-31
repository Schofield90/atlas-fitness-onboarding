'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import PhoneNumberStatus from '@/app/components/settings/sms/PhoneNumberStatus'
import { MessageSquare, Plus, Settings, BarChart3, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface PhoneNumber {
  id: string
  phone_number: string
  country_code: string
  number_type: string
  status: string
  is_primary: boolean
  capabilities: {
    sms: boolean
    voice: boolean
    whatsapp: boolean
  }
  monthly_cost_pence: number
}

interface RegulatoryBundle {
  id: string
  bundle_status: string
  submission_date: string | null
  approval_date: string | null
  rejection_reason: string | null
}

interface SMSSettings {
  id: string
  provider: string
  sender_id: string | null
  is_active: boolean
  message_templates: Record<string, any>
  usage_limits: {
    daily_limit: number
    monthly_limit: number
  }
}

interface OrganizationStatus {
  has_phone: boolean
  phone_count: number
  primary_number: string | null
  bundle_status: string
  setup_stage: string
}

export default function SMSSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [regulatoryBundle, setRegulatoryBundle] = useState<RegulatoryBundle | null>(null)
  const [smsSettings, setSmsSettings] = useState<SMSSettings | null>(null)
  const [organizationStatus, setOrganizationStatus] = useState<OrganizationStatus | null>(null)
  const [usageStats, setUsageStats] = useState({
    thisMonth: { sent: 0, received: 0, cost_pence: 0 },
    today: { sent: 0, received: 0, cost_pence: 0 }
  })

  const supabase = createClient()

  useEffect(() => {
    loadSMSData()
  }, [])

  const loadSMSData = async () => {
    try {
      setLoading(true)

      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const organizationId = userOrg.organization_id

      // Load organization phone status
      const { data: statusData } = await supabase
        .rpc('get_org_phone_status', { org_id: organizationId })

      if (statusData && statusData.length > 0) {
        setOrganizationStatus(statusData[0])
      }

      // Load phone numbers
      const { data: phonesData } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_primary', { ascending: false })

      setPhoneNumbers(phonesData || [])

      // Load regulatory bundle
      const { data: bundleData } = await supabase
        .from('regulatory_bundles')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      setRegulatoryBundle(bundleData)

      // Load SMS settings
      const { data: settingsData } = await supabase
        .from('sms_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      setSmsSettings(settingsData)

      // Load usage statistics
      await loadUsageStats(organizationId)

    } catch (error) {
      console.error('Error loading SMS data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsageStats = async (organizationId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')

    // Get today's usage
    const { data: todayStats } = await supabase
      .from('sms_usage_stats')
      .select('messages_sent, messages_received, cost_pence')
      .eq('organization_id', organizationId)
      .eq('date', today)

    // Get this month's usage
    const { data: monthStats } = await supabase
      .from('sms_usage_stats')
      .select('messages_sent, messages_received, cost_pence')
      .eq('organization_id', organizationId)
      .gte('date', thisMonth + '-01')
      .lte('date', thisMonth + '-31')

    const todayTotals = todayStats?.reduce((acc, stat) => ({
      sent: acc.sent + stat.messages_sent,
      received: acc.received + stat.messages_received,
      cost_pence: acc.cost_pence + stat.cost_pence
    }), { sent: 0, received: 0, cost_pence: 0 }) || { sent: 0, received: 0, cost_pence: 0 }

    const monthTotals = monthStats?.reduce((acc, stat) => ({
      sent: acc.sent + stat.messages_sent,
      received: acc.received + stat.messages_received,
      cost_pence: acc.cost_pence + stat.cost_pence
    }), { sent: 0, received: 0, cost_pence: 0 }) || { sent: 0, received: 0, cost_pence: 0 }

    setUsageStats({
      today: todayTotals,
      thisMonth: monthTotals
    })
  }

  const getSetupProgress = () => {
    if (!organizationStatus) return { progress: 0, stage: 'Not Started' }

    switch (organizationStatus.setup_stage) {
      case 'not_started':
        return { progress: 0, stage: 'Not Started' }
      case 'in_progress':
        return { progress: 25, stage: 'Application in Progress' }
      case 'under_review':
        return { progress: 50, stage: 'Under Review' }
      case 'provisioning':
        return { progress: 75, stage: 'Provisioning Number' }
      case 'completed':
        return { progress: 100, stage: 'Active' }
      default:
        return { progress: 0, stage: 'Unknown' }
    }
  }

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const { progress, stage } = getSetupProgress()

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="SMS & Phone Numbers"
        description="Manage your UK phone numbers and SMS service with regulatory compliance"
        icon={<MessageSquare className="h-6 w-6" />}
        action={
          organizationStatus?.setup_stage === 'completed' ? (
            <Link
              href="/settings/sms/numbers/add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Number
            </Link>
          ) : (
            <Link
              href="/settings/sms/setup"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Get Started
            </Link>
          )
        }
      />

      {/* Setup Progress */}
      {organizationStatus?.setup_stage !== 'completed' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-white">UK Number Setup</h3>
              <p className="text-sm text-gray-400">Complete setup to send SMS messages</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{progress}%</div>
              <div className="text-sm text-gray-400">{stage}</div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {regulatoryBundle?.rejection_reason && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-300 mb-2">Application Rejected</h4>
              <p className="text-sm text-red-200">{regulatoryBundle.rejection_reason}</p>
              <Link
                href="/settings/sms/setup"
                className="inline-block mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Fix Issues
              </Link>
            </div>
          )}

          <Link
            href="/settings/sms/setup"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {progress > 0 ? 'Continue Setup' : 'Start Setup'}
          </Link>
        </div>
      )}

      {/* Phone Numbers */}
      {phoneNumbers.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Your Phone Numbers</h3>
          <div className="space-y-4">
            {phoneNumbers.map((phone) => (
              <PhoneNumberStatus key={phone.id} phoneNumber={phone} />
            ))}
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {organizationStatus?.setup_stage === 'completed' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Today's Messages</div>
              <MessageSquare className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {usageStats.today.sent + usageStats.today.received}
            </div>
            <div className="text-xs text-gray-500">
              {usageStats.today.sent} sent, {usageStats.today.received} received
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">This Month</div>
              <BarChart3 className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {usageStats.thisMonth.sent + usageStats.thisMonth.received}
            </div>
            <div className="text-xs text-gray-500">
              {usageStats.thisMonth.sent} sent, {usageStats.thisMonth.received} received
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Today's Cost</div>
              <span className="text-xs text-yellow-400">£</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {formatCurrency(usageStats.today.cost_pence)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Monthly Cost</div>
              <span className="text-xs text-yellow-400">£</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">
              {formatCurrency(usageStats.thisMonth.cost_pence)}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/settings/sms/templates"
          className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <BookOpen className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
            <h3 className="font-medium text-white">Message Templates</h3>
          </div>
          <p className="text-sm text-gray-400">
            Create and manage reusable SMS templates for common messages
          </p>
          <div className="text-xs text-blue-400 mt-2">
            {smsSettings?.message_templates ? Object.keys(smsSettings.message_templates).length : 0} templates
          </div>
        </Link>

        <Link
          href="/settings/sms/usage"
          className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <BarChart3 className="h-6 w-6 text-green-400 group-hover:text-green-300" />
            <h3 className="font-medium text-white">Usage Analytics</h3>
          </div>
          <p className="text-sm text-gray-400">
            View detailed SMS usage statistics and delivery reports
          </p>
          <div className="text-xs text-green-400 mt-2">
            View detailed reports
          </div>
        </Link>

        <Link
          href="/settings/sms/configuration"
          className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Settings className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
            <h3 className="font-medium text-white">Advanced Settings</h3>
          </div>
          <p className="text-sm text-gray-400">
            Configure quiet hours, auto-responses, and compliance settings
          </p>
          <div className="text-xs text-purple-400 mt-2">
            Configure settings
          </div>
        </Link>
      </div>

      {/* Help Section */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-300 mb-3">UK SMS Compliance</h3>
        <div className="space-y-2 text-sm text-blue-200">
          <p>• All SMS messages must comply with UK regulations and include clear opt-out instructions</p>
          <p>• Messages are only sent between 8 AM and 10 PM UK time unless it's an emergency</p>
          <p>• Customers can reply STOP to unsubscribe from all messages</p>
          <p>• Business verification is required for commercial SMS messaging</p>
        </div>
        <Link
          href="/help/sms-compliance"
          className="inline-block mt-4 text-blue-400 hover:text-blue-300 underline"
        >
          Learn more about SMS compliance →
        </Link>
      </div>
    </div>
  )
}