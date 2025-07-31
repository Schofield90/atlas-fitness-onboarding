'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { EmailService, EmailConfiguration } from '@/app/lib/services/email'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { Mail, Server, Globe, CheckCircle, AlertCircle, ArrowRight, Copy, ExternalLink } from 'lucide-react'

interface Organization {
  id: string
  name: string
}

interface DNSRecord {
  type: string
  name: string
  value: string
  status: 'verified' | 'pending' | 'failed'
}

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [emailConfig, setEmailConfig] = useState<EmailConfiguration | null>(null)
  const [emailService, setEmailService] = useState<EmailService | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([])
  const [verifyingDns, setVerifyingDns] = useState(false)

  const [formData, setFormData] = useState({
    service_type: 'shared' as 'shared' | 'dedicated',
    from_name: '',
    from_email: '',
    reply_to_email: '',
    subdomain: '',
    custom_domain: '',
    resend_api_key: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadEmailConfiguration()
  }, [])

  const loadEmailConfiguration = async () => {
    try {
      setLoading(true)

      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(id, name)')
        .eq('user_id', user.id)
        .single()

      if (!userOrg?.organizations) return

      const org = Array.isArray(userOrg.organizations) 
        ? userOrg.organizations[0] as Organization
        : userOrg.organizations as Organization
      setOrganization(org)

      // Initialize email service
      const service = new EmailService(org.id)
      setEmailService(service)

      // Load existing configuration
      const config = await service.getEmailConfiguration()
      if (config) {
        setEmailConfig(config)
        setFormData({
          service_type: config.service_type,
          from_name: config.from_name,
          from_email: config.from_email,
          reply_to_email: config.reply_to_email || '',
          subdomain: config.subdomain || '',
          custom_domain: config.custom_domain || '',
          resend_api_key: config.resend_api_key || ''
        })
        setActiveStep(config.setup_step)

        // Load DNS records if using custom domain
        if (config.service_type === 'dedicated' && config.custom_domain) {
          const dnsResult = await service.verifyDNSRecords(config.custom_domain)
          setDnsRecords(dnsResult.records)
        }
      } else {
        // Set default values for new setup
        setFormData(prev => ({
          ...prev,
          from_name: org.name,
          from_email: `hello@${org.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        }))
      }
    } catch (error) {
      console.error('Error loading email configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSubdomain = async () => {
    if (!emailService || !organization) return

    const subdomain = await emailService.generateUniqueSubdomain(organization.name)
    setFormData(prev => ({
      ...prev,
      subdomain,
      from_email: `hello@${subdomain}.mail.gymleadhub.com`
    }))
  }

  const handleSave = async () => {
    if (!emailService) return

    try {
      setSaving(true)

      const configData: Partial<EmailConfiguration> = {
        service_type: formData.service_type,
        from_name: formData.from_name,
        from_email: formData.from_email,
        reply_to_email: formData.reply_to_email || undefined,
        daily_limit: formData.service_type === 'shared' ? 100 : 1000,
        setup_step: activeStep,
        setup_completed: activeStep >= 4
      }

      if (formData.service_type === 'shared') {
        configData.subdomain = formData.subdomain
        configData.shared_domain = 'mail.gymleadhub.com'
      } else {
        configData.custom_domain = formData.custom_domain
        configData.resend_api_key = formData.resend_api_key
      }

      const success = await emailService.saveEmailConfiguration(configData)
      if (success) {
        await loadEmailConfiguration() // Refresh data
        
        // Auto-advance to next step if applicable
        if (activeStep < 4) {
          setActiveStep(activeStep + 1)
        }
      } else {
        alert('Failed to save email configuration')
      }
    } catch (error) {
      console.error('Error saving email configuration:', error)
      alert('Failed to save email configuration')
    } finally {
      setSaving(false)
    }
  }

  const verifyDNS = async () => {
    if (!emailService || !formData.custom_domain) return

    try {
      setVerifyingDns(true)
      const result = await emailService.verifyDNSRecords(formData.custom_domain)
      setDnsRecords(result.records)
      
      if (result.verified) {
        // Update configuration with verified status
        await emailService.saveEmailConfiguration({
          dns_verified: true,
          setup_step: 4,
          setup_completed: true
        })
        await loadEmailConfiguration()
      }
    } catch (error) {
      console.error('Error verifying DNS:', error)
    } finally {
      setVerifyingDns(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Choose Email Service Type</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Shared Server Option */}
          <div 
            className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.service_type === 'shared' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, service_type: 'shared' }))}
          >
            <div className="flex items-center justify-between mb-3">
              <Server className="h-8 w-8 text-blue-400" />
              <span className="text-sm bg-green-900 text-green-300 px-2 py-1 rounded">Recommended</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Shared Server</h4>
            <p className="text-gray-400 mb-4">
              Use our managed email infrastructure with your branded subdomain
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                Quick 5-minute setup
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                100 emails/day included
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                Branded domain (yourgym.mail.gymleadhub.com)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                No DNS configuration required
              </li>
            </ul>
          </div>

          {/* Dedicated Server Option */}
          <div 
            className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.service_type === 'dedicated' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, service_type: 'dedicated' }))}
          >
            <div className="flex items-center justify-between mb-3">
              <Globe className="h-8 w-8 text-purple-400" />
              <span className="text-sm bg-purple-900 text-purple-300 px-2 py-1 rounded">Advanced</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Dedicated Server</h4>
            <p className="text-gray-400 mb-4">
              Use your own domain with your Resend API key
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                Your custom domain (mail@yourgym.com)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                Higher sending limits
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                Full brand control
              </li>
              <li className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-400 mr-2" />
                Requires DNS setup
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setActiveStep(2)}
          disabled={!formData.service_type}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
        >
          <span>Next</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Email Configuration</h3>
        
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              From Name *
            </label>
            <input
              type="text"
              value={formData.from_name}
              onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="Your Gym Name"
            />
          </div>

          {formData.service_type === 'shared' ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Subdomain *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="yourgym"
                />
                <button
                  onClick={generateSubdomain}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your emails will be sent from: {formData.subdomain}@mail.gymleadhub.com
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Custom Domain *
                </label>
                <input
                  type="text"
                  value={formData.custom_domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="yourgym.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Resend API Key *
                </label>
                <input
                  type="password"
                  value={formData.resend_api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, resend_api_key: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="re_..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a 
                    href="https://resend.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    resend.com/api-keys <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              From Email *
            </label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="hello@yourgym.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Reply-To Email (Optional)
            </label>
            <input
              type="email"
              value={formData.reply_to_email}
              onChange={(e) => setFormData(prev => ({ ...prev, reply_to_email: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="support@yourgym.com"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setActiveStep(1)}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.from_name || !formData.from_email}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      {formData.service_type === 'dedicated' ? (
        <>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">DNS Configuration</h3>
            <p className="text-gray-400 mb-6">
              Add these DNS records to your domain to enable email sending:
            </p>
          </div>

          <div className="space-y-4">
            {dnsRecords.map((record, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">
                      {record.type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      record.status === 'verified' 
                        ? 'bg-green-900 text-green-300'
                        : record.status === 'failed'
                        ? 'bg-red-900 text-red-300'
                        : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(record.value)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>{' '}
                    <span className="font-mono text-white">{record.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Value:</span>{' '}
                    <span className="font-mono text-white break-all">{record.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setActiveStep(2)}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={verifyDNS}
              disabled={verifyingDns}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              {verifyingDns ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify DNS</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Setup Complete!</h3>
            <div className="p-6 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <div>
                  <h4 className="text-lg font-medium text-white">Shared Email Server Ready</h4>
                  <p className="text-green-300">Your email service is configured and ready to use.</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong>From Email:</strong> {formData.from_email}</p>
                <p><strong>Daily Limit:</strong> 100 emails</p>
                <p><strong>Domain:</strong> {formData.subdomain}.mail.gymleadhub.com</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setActiveStep(2)}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
            >
              <span>Complete Setup</span>
              <CheckCircle className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Email Service Active</h3>
        <div className="p-6 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div>
              <h4 className="text-lg font-medium text-white">
                {formData.service_type === 'shared' ? 'Shared' : 'Dedicated'} Email Service Active
              </h4>
              <p className="text-green-300">Your email service is fully configured and operational.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-gray-400">Configuration:</p>
              <div className="space-y-1 text-gray-300">
                <p><strong>Service Type:</strong> {formData.service_type === 'shared' ? 'Shared Server' : 'Dedicated Server'}</p>
                <p><strong>From Name:</strong> {formData.from_name}</p>
                <p><strong>From Email:</strong> {formData.from_email}</p>
                {formData.reply_to_email && (
                  <p><strong>Reply-To:</strong> {formData.reply_to_email}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-gray-400">Service Details:</p>
              <div className="space-y-1 text-gray-300">
                {formData.service_type === 'shared' ? (
                  <>
                    <p><strong>Domain:</strong> {formData.subdomain}.mail.gymleadhub.com</p>
                    <p><strong>Daily Limit:</strong> 100 emails</p>
                  </>
                ) : (
                  <>
                    <p><strong>Custom Domain:</strong> {formData.custom_domain}</p>
                    <p><strong>DNS Verified:</strong> {emailConfig?.dns_verified ? 'Yes' : 'Pending'}</p>
                  </>
                )}
                <p><strong>Status:</strong> <span className="text-green-400">Active</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <h4 className="text-lg font-medium text-white mb-2">Email Templates</h4>
          <p className="text-gray-400 text-sm mb-3">Create and manage email templates</p>
          <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
            Manage Templates
          </button>
        </div>
        
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <h4 className="text-lg font-medium text-white mb-2">Send Test Email</h4>
          <p className="text-gray-400 text-sm mb-3">Verify your email configuration</p>
          <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors">
            Send Test
          </button>
        </div>
        
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <h4 className="text-lg font-medium text-white mb-2">Usage Statistics</h4>
          <p className="text-gray-400 text-sm mb-3">View email sending metrics</p>
          <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors">
            View Stats
          </button>
        </div>
      </div>

      {emailConfig && !emailConfig.setup_completed && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <span>Complete Setup</span>
                <CheckCircle className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Email Service"
        description="Configure your email sending service for marketing and transactional emails"
        icon={<Mail className="h-6 w-6" />}
      />

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step < activeStep 
                ? 'bg-green-600 text-white' 
                : step === activeStep 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400'
            }`}>
              {step < activeStep ? <CheckCircle className="h-4 w-4" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-12 h-0.5 mx-2 ${
                step < activeStep ? 'bg-green-600' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}
        {activeStep === 3 && renderStep3()}
        {activeStep === 4 && renderStep4()}
      </div>
    </div>
  )
}