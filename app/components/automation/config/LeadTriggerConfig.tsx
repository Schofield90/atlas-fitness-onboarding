'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, Facebook, Globe, Mail, Phone, FileText, Webhook, Plus, X, MessageSquare, Instagram, Calendar, User, Tag, Clock, PhoneCall, MousePointer, AlertTriangle, CheckCircle, XCircle, Target, TrendingUp, TrendingDown } from 'lucide-react'

interface TriggerType {
  id: string
  name: string
  description?: string
}

interface FacebookPage {
  id: string
  name: string
}

interface FacebookForm {
  id: string
  name: string
  pageId: string
}

interface WebsiteForm {
  id: string
  name: string
  type: string
}

interface LeadTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

const TRIGGER_TYPES: TriggerType[] = [
  { id: 'facebook_lead_form', name: 'Facebook lead form submitted', description: 'When a lead submits a Facebook lead form' },
  { id: 'instagram_lead_form', name: 'Instagram lead form submitted', description: 'When a lead submits an Instagram lead form' },
  { id: 'website_form', name: 'Website form submitted', description: 'When a lead submits a form on your website' },
  { id: 'landing_page_form', name: 'Landing page form submitted', description: 'When a lead submits a landing page form' },
  { id: 'survey_form', name: 'Survey form submitted', description: 'When a lead completes a survey' },
  { id: 'chat_widget', name: 'Chat widget interaction', description: 'When a lead starts a chat conversation' },
  { id: 'phone_call', name: 'Phone call received', description: 'When a phone call is received' },
  { id: 'sms_received', name: 'SMS message received', description: 'When an SMS is received' },
  { id: 'email_received', name: 'Email received', description: 'When an email is received' },
  { id: 'manual_entry', name: 'Manual lead entry', description: 'When a lead is manually added' },
  { id: 'webhook', name: 'Webhook received', description: 'When a webhook payload is received' },
  
  // Contact Management Triggers
  { id: 'birthday_trigger', name: 'Contact birthday', description: 'When it is a contact\'s birthday' },
  { id: 'contact_changed', name: 'Contact information changed', description: 'When contact details are updated' },
  { id: 'contact_tagged', name: 'Contact tagged', description: 'When a contact is assigned a tag' },
  { id: 'custom_date_field', name: 'Custom date field reached', description: 'When a custom date field reaches its date' },
  
  // Communication Triggers
  { id: 'call_status_change', name: 'Call status changed', description: 'When a call status changes (answered, missed, etc.)' },
  { id: 'email_opened', name: 'Email opened', description: 'When a contact opens an email' },
  { id: 'email_clicked', name: 'Email link clicked', description: 'When a contact clicks a link in an email' },
  { id: 'email_bounced', name: 'Email bounced', description: 'When an email bounces' },
  { id: 'email_unsubscribed', name: 'Email unsubscribed', description: 'When a contact unsubscribes from emails' },
  
  // Appointment Triggers
  { id: 'appointment_booked', name: 'Appointment booked', description: 'When an appointment is scheduled' },
  { id: 'appointment_cancelled', name: 'Appointment cancelled', description: 'When an appointment is cancelled' },
  { id: 'appointment_completed', name: 'Appointment completed', description: 'When an appointment is marked as completed' },
  { id: 'appointment_no_show', name: 'Appointment no-show', description: 'When a contact doesn\'t show up for an appointment' },
  
  // Opportunity/Pipeline Triggers
  { id: 'opportunity_created', name: 'Opportunity created', description: 'When a new opportunity is created' },
  { id: 'opportunity_stage_changed', name: 'Opportunity stage changed', description: 'When an opportunity moves to a different stage' },
  { id: 'opportunity_won', name: 'Opportunity won', description: 'When an opportunity is marked as won' },
  { id: 'opportunity_lost', name: 'Opportunity lost', description: 'When an opportunity is marked as lost' }
]

export default function LeadTriggerConfig({ config, onChange, organizationId }: LeadTriggerConfigProps) {
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>(config.triggerType || '')
  const [triggerName, setTriggerName] = useState(config.name || '')
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false)
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([])
  const [facebookForms, setFacebookForms] = useState<FacebookForm[]>([])
  const [websiteForms, setWebsiteForms] = useState<WebsiteForm[]>([])
  const [filters, setFilters] = useState(config.filters || {
    pageId: 'any',
    formId: 'any'
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.triggerType) {
      setSelectedTriggerType(config.triggerType)
    }
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAvailableData()
  }, [organizationId, selectedTriggerType])

  useEffect(() => {
    // Auto-generate trigger name based on selection
    if (selectedTriggerType && !triggerName) {
      const trigger = TRIGGER_TYPES.find(t => t.id === selectedTriggerType)
      if (trigger) {
        let name = trigger.name
        if (selectedTriggerType === 'facebook_lead_form' && filters.pageId !== 'any') {
          const page = facebookPages.find(p => p.id === filters.pageId)
          if (page) name = `Facebook Lead Form - ${page.name}`
        }
        setTriggerName(name)
      }
    }
  }, [selectedTriggerType, filters])

  const loadAvailableData = async () => {
    try {
      setLoading(true)
      
      if (selectedTriggerType === 'facebook_lead_form' || selectedTriggerType === 'instagram_lead_form') {
        // Fetch Facebook pages
        const pagesResponse = await fetch('/api/integrations/facebook/pages')
        if (pagesResponse.ok) {
          const pagesData = await pagesResponse.json()
          if (pagesData.pages) {
            setFacebookPages(pagesData.pages.map((page: any) => ({
              id: page.id,
              name: page.name
            })))
            
            // Extract all forms from pages
            const allForms: FacebookForm[] = []
            pagesData.pages.forEach((page: any) => {
              page.forms?.forEach((form: any) => {
                allForms.push({
                  id: form.facebook_form_id || form.id,
                  name: form.form_name || form.name,
                  pageId: page.id
                })
              })
            })
            setFacebookForms(allForms)
          }
        } else {
          console.error('Failed to fetch Facebook pages')
        }
      }
      
      if (selectedTriggerType === 'website_form') {
        // Fetch website forms
        const formsResponse = await fetch('/api/integrations/website/forms')
        if (formsResponse.ok) {
          const formsData = await formsResponse.json()
          if (formsData.forms) {
            setWebsiteForms(formsData.forms)
          }
        } else {
          console.error('Failed to fetch website forms')
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerTypeSelect = (triggerId: string) => {
    setSelectedTriggerType(triggerId)
    const trigger = TRIGGER_TYPES.find(t => t.id === triggerId)
    if (trigger) {
      setTriggerName(trigger.name)
    }
    onChange({
      ...config,
      triggerType: triggerId,
      name: trigger?.name || ''
    })
    setShowTriggerDropdown(false)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
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

  const getFilteredForms = () => {
    if (filters.pageId === 'any' || !filters.pageId) {
      return facebookForms
    }
    return facebookForms.filter(form => form.pageId === filters.pageId)
  }

  const getSelectedTrigger = () => {
    return TRIGGER_TYPES.find(t => t.id === selectedTriggerType)
  }

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Trigger Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
          CHOOSE A WORKFLOW TRIGGER
        </label>
        <div className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-left"
            onClick={() => setShowTriggerDropdown(!showTriggerDropdown)}
          >
            <span className={selectedTriggerType ? 'text-gray-900' : 'text-gray-500'}>
              {getSelectedTrigger()?.name || 'Select a trigger...'}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showTriggerDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showTriggerDropdown && (
            <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-auto">
              {TRIGGER_TYPES.map((trigger) => (
                <button
                  key={trigger.id}
                  type="button"
                  className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                  onClick={() => handleTriggerTypeSelect(trigger.id)}
                >
                  <div className="font-medium text-gray-900">{trigger.name}</div>
                  {trigger.description && (
                    <div className="text-sm text-gray-500 mt-1">{trigger.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trigger Name */}
      {selectedTriggerType && (
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
      )}

      {/* Filters - Facebook Lead Form */}
      {selectedTriggerType === 'facebook_lead_form' && (
        facebookPages.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Facebook className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Facebook Pages Connected
            </h3>
            <p className="text-gray-600 mb-4">
              You need to connect your Facebook account and select pages to use Facebook lead forms.
            </p>
            <a
              href="/integrations/facebook"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Facebook Account
            </a>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
              FILTERS
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Please ensure your facebook form fields are mapped <a href="#" className="text-blue-600 hover:underline">here</a>
            </p>
          </div>

          {/* Page Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <select
                  value={filters.pageId || 'any'}
                  onChange={(e) => handleFilterChange('pageId', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Page Is Any</option>
                  {facebookPages.map(page => (
                    <option key={page.id} value={page.id}>{page.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                {filters.pageId && filters.pageId !== 'any' ? facebookPages.find(p => p.id === filters.pageId)?.name : 'Any'}
              </span>
            </div>
          </div>

          {/* Form Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <select
                  value={filters.formId || 'any'}
                  onChange={(e) => handleFilterChange('formId', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Form Is Any</option>
                  {getFilteredForms().map(form => (
                    <option key={form.id} value={form.id}>{form.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 relative">
              <span className={`px-4 py-3 ${filters.formId && filters.formId !== 'any' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} rounded-lg block text-center`}>
                {filters.formId && filters.formId !== 'any' ? getFilteredForms().find(f => f.id === filters.formId)?.name : 'Any'}
                {filters.formId && filters.formId !== 'any' && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('formId', 'any')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </span>
            </div>
          </div>

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
        )
      )}

      {/* Filters - Website Form */}
      {selectedTriggerType === 'website_form' && (
        websiteForms.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Globe className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Website Forms Created
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create website forms before you can use them as triggers.
            </p>
            <a
              href="/forms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Website Form
            </a>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
              FILTERS
            </label>
          </div>

          {/* Form Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <select
                  value={filters.formId || 'any'}
                  onChange={(e) => handleFilterChange('formId', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Form Is Any</option>
                  {websiteForms.map(form => (
                    <option key={form.id} value={form.id}>{form.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                {filters.formId && filters.formId !== 'any' ? websiteForms.find(f => f.id === filters.formId)?.name : 'Any'}
              </span>
            </div>
          </div>
        </div>
        )
      )}

    </div>
  )
}