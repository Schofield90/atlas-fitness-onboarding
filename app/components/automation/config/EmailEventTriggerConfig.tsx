'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Mail, MailOpen, MailX, MousePointer, Plus, X, Link, AlertCircle } from 'lucide-react'

interface EmailEventTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface EmailProvider {
  id: string
  name: string
  type: 'sendgrid' | 'mailchimp' | 'gmail' | 'outlook' | 'custom'
  isConnected: boolean
  trackingEnabled: boolean
  lastSync?: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  provider: string
  isActive: boolean
  sentCount: number
}

export default function EmailEventTriggerConfig({ config, onChange, organizationId }: EmailEventTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Email Event Trigger')
  const [emailProviders, setEmailProviders] = useState<EmailProvider[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [filters, setFilters] = useState(config.filters || {
    eventType: 'any_event', // 'any_event', 'specific_event', 'event_group'
    specificEvents: [], // Array of specific events to watch
    eventGroup: 'engagement', // 'engagement', 'delivery', 'bounces'
    providerFilter: 'any', // 'any' or specific provider ID
    templateFilter: 'any', // 'any' or specific template ID
    timeWindow: 'immediate', // 'immediate', 'within_hours', 'within_days'
    timeValue: 1, // Number for time window
    recipientFilters: [], // Array of recipient filters
    campaignFilter: 'any' // 'any' or specific campaign ID
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  // Common email events across different providers
  const emailEvents = [
    { value: 'sent', label: 'Email Sent', group: 'delivery', icon: Mail },
    { value: 'delivered', label: 'Email Delivered', group: 'delivery', icon: Mail },
    { value: 'opened', label: 'Email Opened', group: 'engagement', icon: MailOpen },
    { value: 'clicked', label: 'Link Clicked', group: 'engagement', icon: MousePointer },
    { value: 'replied', label: 'Email Replied', group: 'engagement', icon: Mail },
    { value: 'forwarded', label: 'Email Forwarded', group: 'engagement', icon: Mail },
    { value: 'bounced', label: 'Email Bounced', group: 'bounces', icon: MailX },
    { value: 'unsubscribed', label: 'Unsubscribed', group: 'bounces', icon: MailX },
    { value: 'spam_report', label: 'Marked as Spam', group: 'bounces', icon: AlertCircle },
    { value: 'dropped', label: 'Email Dropped', group: 'bounces', icon: MailX }
  ]

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadEmailProviders()
    loadEmailTemplates()
  }, [organizationId])

  const loadEmailProviders = async () => {
    try {
      setLoading(true)
      
      // Load connected email providers/integrations
      const response = await fetch('/api/integrations/email-providers')
      if (response.ok) {
        const data = await response.json()
        if (data.providers) {
          setEmailProviders(data.providers)
        }
      } else {
        // Mock data for demo purposes
        setEmailProviders([
          {
            id: 'sendgrid-1',
            name: 'SendGrid',
            type: 'sendgrid',
            isConnected: true,
            trackingEnabled: true,
            lastSync: new Date().toISOString()
          },
          {
            id: 'mailchimp-1',
            name: 'Mailchimp',
            type: 'mailchimp',
            isConnected: true,
            trackingEnabled: true
          },
          {
            id: 'gmail-1',
            name: 'Gmail Business',
            type: 'gmail',
            isConnected: false,
            trackingEnabled: false
          }
        ])
      }
    } catch (error) {
      console.error('Error loading email providers:', error)
      setEmailProviders([])
    }
  }

  const loadEmailTemplates = async () => {
    try {
      // Load email templates
      const response = await fetch('/api/email/templates')
      if (response.ok) {
        const data = await response.json()
        if (data.templates) {
          setEmailTemplates(data.templates)
        }
      } else {
        // Mock templates
        setEmailTemplates([
          {
            id: 'welcome-1',
            name: 'Welcome Email',
            subject: 'Welcome to our gym!',
            provider: 'sendgrid-1',
            isActive: true,
            sentCount: 125
          },
          {
            id: 'follow-up-1',
            name: 'Follow-up Email',
            subject: 'How was your first workout?',
            provider: 'sendgrid-1',
            isActive: true,
            sentCount: 89
          }
        ])
      }
    } catch (error) {
      console.error('Error loading email templates:', error)
      setEmailTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleEventSelection = (eventValue: string) => {
    const currentEvents = filters.specificEvents
    let newEvents
    
    if (currentEvents.includes(eventValue)) {
      newEvents = currentEvents.filter((e: string) => e !== eventValue)
    } else {
      newEvents = [...currentEvents, eventValue]
    }
    
    handleFilterChange('specificEvents', newEvents)
  }

  const addRecipientFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      type: 'email_contains', // 'email_contains', 'email_equals', 'domain_equals', 'contact_exists'
      value: ''
    }
    handleFilterChange('recipientFilters', [...filters.recipientFilters, newFilter])
  }

  const updateRecipientFilter = (id: string, updates: any) => {
    const updatedFilters = filters.recipientFilters.map((f: any) => 
      f.id === id ? { ...f, ...updates } : f
    )
    handleFilterChange('recipientFilters', updatedFilters)
  }

  const removeRecipientFilter = (id: string) => {
    const updatedFilters = filters.recipientFilters.filter((f: any) => f.id !== id)
    handleFilterChange('recipientFilters', updatedFilters)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'email.recipient',
      operator: 'contains',
      value: ''
    }
    setAdditionalFilters([...additionalFilters, newFilter])
    onChange({ ...config, additionalFilters: [...additionalFilters, newFilter] })
  }

  const updateAdditionalFilter = (id: string, updates: any) => {
    const updated = additionalFilters.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const removeAdditionalFilter = (id: string) => {
    const updated = additionalFilters.filter((f: any) => f.id !== id)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const getEventsByGroup = (group: string) => {
    return emailEvents.filter(event => event.group === group)
  }

  const getProviderName = (providerId: string) => {
    const provider = emailProviders.find(p => p.id === providerId)
    return provider?.name || providerId
  }

  if (loading) {
    return <div className="p-4 text-center">Loading email configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Trigger Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
          WORKFLOW TRIGGER NAME
        </label>
        <input
          type="text"
          value={triggerName}
          onChange={(e) => {
            setTriggerName(e.target.value)
            onChange({ ...config, name: e.target.value })
          }}
          placeholder="Enter trigger name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Email Event Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            EMAIL EVENT TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure triggers based on email events like opens, clicks, bounces, etc.
          </p>
        </div>

        {/* Email Providers Status */}
        {emailProviders.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Mail className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Email Providers Connected
            </h3>
            <p className="text-gray-600 mb-4">
              Connect an email service to track email events and trigger workflows.
            </p>
            <a
              href="/integrations/email-providers"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Email Service
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MailOpen className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  {emailProviders.filter(p => p.isConnected).length} of {emailProviders.length} email providers connected
                </span>
              </div>
              <a
                href="/integrations/email-providers"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Manage Providers
              </a>
            </div>
            <div className="mt-2 space-y-1">
              {emailProviders.map(provider => (
                <div key={provider.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{provider.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      provider.isConnected 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {provider.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    {provider.isConnected && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        provider.trackingEnabled 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {provider.trackingEnabled ? 'Tracking On' : 'No Tracking'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provider Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email provider
            </label>
            <div className="relative">
              <select
                value={filters.providerFilter}
                onChange={(e) => handleFilterChange('providerFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any connected provider</option>
                {emailProviders.filter(p => p.isConnected).map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Event Type */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger when
            </label>
            <div className="relative">
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any_event">Any email event occurs</option>
                <option value="specific_event">Specific events only</option>
                <option value="event_group">Event group changes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Specific Event Selection */}
        {filters.eventType === 'specific_event' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select email events to monitor
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {emailEvents.map(event => {
                const IconComponent = event.icon
                return (
                  <label
                    key={event.value}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.specificEvents.includes(event.value)}
                      onChange={() => handleEventSelection(event.value)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <IconComponent className="w-4 h-4 text-gray-500 mr-2" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{event.label}</span>
                      <div className="text-xs text-gray-500 capitalize">
                        {event.group}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Selected Events Display */}
            {filters.specificEvents.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected events ({filters.specificEvents.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {filters.specificEvents.map((eventValue: string) => {
                    const event = emailEvents.find(e => e.value === eventValue)
                    return (
                      <span
                        key={eventValue}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {event?.label || eventValue}
                        <button
                          type="button"
                          onClick={() => handleEventSelection(eventValue)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Group Selection */}
        {filters.eventType === 'event_group' && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event group
              </label>
              <div className="relative">
                <select
                  value={filters.eventGroup}
                  onChange={(e) => handleFilterChange('eventGroup', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="engagement">Engagement events (opens, clicks, replies)</option>
                  <option value="delivery">Delivery events (sent, delivered)</option>
                  <option value="bounces">Negative events (bounces, spam, unsubscribes)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Template Filter */}
        {emailTemplates.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email template
              </label>
              <div className="relative">
                <select
                  value={filters.templateFilter}
                  onChange={(e) => handleFilterChange('templateFilter', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any email template</option>
                  {emailTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.subject}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Time Window */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time window
              </label>
              <div className="relative">
                <select
                  value={filters.timeWindow}
                  onChange={(e) => handleFilterChange('timeWindow', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="immediate">Trigger immediately</option>
                  <option value="within_hours">Within X hours</option>
                  <option value="within_days">Within X days</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {(filters.timeWindow === 'within_hours' || filters.timeWindow === 'within_days') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time value
              </label>
              <input
                type="number"
                value={filters.timeValue || 1}
                onChange={(e) => handleFilterChange('timeValue', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
                min="1"
                max={filters.timeWindow === 'within_hours' ? 72 : 30}
              />
            </div>
          )}
        </div>

        {/* Recipient Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Recipient filters (optional)
            </label>
            <button
              type="button"
              onClick={addRecipientFilter}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Filter
            </button>
          </div>

          {filters.recipientFilters.map((filter: any) => (
            <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <select
                value={filter.type}
                onChange={(e) => updateRecipientFilter(filter.id, { type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="email_contains">Email contains</option>
                <option value="email_equals">Email equals</option>
                <option value="domain_equals">Domain equals</option>
                <option value="contact_exists">Contact exists in CRM</option>
              </select>
              
              {filter.type !== 'contact_exists' && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateRecipientFilter(filter.id, { value: e.target.value })}
                  placeholder="Enter value..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              
              <button
                type="button"
                onClick={() => removeRecipientFilter(filter.id)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Additional Filters */}
        {additionalFilters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Additional Filters</label>
            {additionalFilters.map((filter: any) => (
              <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <select
                  value={filter.field}
                  onChange={(e) => updateAdditionalFilter(filter.id, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="email.recipient">Email Recipient</option>
                  <option value="email.subject">Email Subject</option>
                  <option value="email.campaign_id">Campaign ID</option>
                  <option value="email.timestamp">Event Time</option>
                  <option value="email.user_agent">User Agent</option>
                  <option value="email.ip_address">IP Address</option>
                  <option value="contact.name">Contact Name</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="exists">exists</option>
                  <option value="not_exists">not exists</option>
                </select>
                
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateAdditionalFilter(filter.id, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  type="button"
                  onClick={() => removeAdditionalFilter(filter.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add More Filters */}
        <button
          type="button"
          onClick={addAdditionalFilter}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <Plus className="w-5 h-5 mr-1" />
          Add filters
        </button>
      </div>
    </div>
  )
}