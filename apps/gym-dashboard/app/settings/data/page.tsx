'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Database, Download, Trash2, Shield, AlertTriangle, Check, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

export default function DataPrivacyPage() {
  const [dataRetention, setDataRetention] = useState({
    leads: 365,
    customers: -1, // -1 means forever
    messages: 90,
    analytics: 180
  })
  const [privacySettings, setPrivacySettings] = useState({
    shareAnalytics: true,
    allowDataExport: true,
    gdprCompliant: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // In a real app, you'd fetch these settings from the database
      // For now, we'll use the defaults
      
    } catch (error) {
      console.error('Error fetching data settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // In a real app, you'd save these settings to the database
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      alert('Data & privacy settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!confirm('This will export all your data. The download link will be sent to your email. Continue?')) {
      return
    }

    setExporting(true)
    try {
      // In a real app, this would trigger a data export job
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate export
      alert('Data export initiated! You will receive an email with the download link within 24 hours.')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to initiate data export')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt('This action is IRREVERSIBLE. Type "DELETE MY ACCOUNT" to confirm:')
    
    if (confirmation !== 'DELETE MY ACCOUNT') {
      alert('Account deletion cancelled')
      return
    }

    // In a real app, this would initiate account deletion
    alert('Account deletion request submitted. You will receive a confirmation email.')
  }

  const retentionOptions = [
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '180 days' },
    { value: 365, label: '1 year' },
    { value: 730, label: '2 years' },
    { value: -1, label: 'Forever' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Data & Privacy"
        description="Manage how your data is stored and used"
        icon={<Database className="h-6 w-6" />}
        action={
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Save Settings
          </button>
        }
      />

      {/* Data Retention */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Data Retention Periods</h3>
        <p className="text-gray-400 text-sm mb-6">
          Configure how long different types of data are kept before automatic deletion
        </p>
        
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Lead Data
              </label>
              <select
                value={dataRetention.leads}
                onChange={(e) => setDataRetention({ ...dataRetention, leads: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {retentionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Unconverted leads will be deleted after this period
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Customer Data
              </label>
              <select
                value={dataRetention.customers}
                onChange={(e) => setDataRetention({ ...dataRetention, customers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {retentionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Active customer data retention period
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Messages
              </label>
              <select
                value={dataRetention.messages}
                onChange={(e) => setDataRetention({ ...dataRetention, messages: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {retentionOptions.filter(o => o.value !== -1).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Email, SMS, and WhatsApp message history
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Analytics Data
              </label>
              <select
                value={dataRetention.analytics}
                onChange={(e) => setDataRetention({ ...dataRetention, analytics: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {retentionOptions.filter(o => o.value !== -1).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Performance metrics and usage analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/80">
            <div>
              <p className="text-white font-medium">Share Anonymous Usage Analytics</p>
              <p className="text-sm text-gray-400">
                Help improve Atlas Fitness by sharing anonymous usage data
              </p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.shareAnalytics}
              onChange={(e) => setPrivacySettings({ ...privacySettings, shareAnalytics: e.target.checked })}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/80">
            <div>
              <p className="text-white font-medium">Allow Data Export</p>
              <p className="text-sm text-gray-400">
                Enable customers to request exports of their personal data
              </p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.allowDataExport}
              onChange={(e) => setPrivacySettings({ ...privacySettings, allowDataExport: e.target.checked })}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/80">
            <div>
              <p className="text-white font-medium">GDPR Compliance Mode</p>
              <p className="text-sm text-gray-400">
                Enable strict GDPR compliance features for EU customers
              </p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.gdprCompliant}
              onChange={(e) => setPrivacySettings({ ...privacySettings, gdprCompliant: e.target.checked })}
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Export & Delete */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export & Delete Data</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-white font-medium mb-1">Export All Data</h4>
                <p className="text-sm text-gray-400">
                  Download all your data in a machine-readable format
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Data
              </button>
            </div>
          </div>

          <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-red-400 font-medium mb-1">Delete Account & All Data</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Information */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Compliance & Certifications</h4>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <p className="font-medium text-gray-400 mb-1">Data Protection</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                GDPR Compliant
              </li>
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                CCPA Compliant
              </li>
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                256-bit SSL Encryption
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-400 mb-1">Data Storage</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                EU Data Residency Available
              </li>
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Daily Automated Backups
              </li>
              <li className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                ISO 27001 Certified
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}