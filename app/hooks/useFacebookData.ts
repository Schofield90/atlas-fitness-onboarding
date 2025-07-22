'use client'

import { useState, useEffect } from 'react'

// Types for Facebook data
export interface FacebookPage {
  id: string
  name: string
  access_token: string
  cover?: string
  category: string
  hasLeadAccess: boolean
  followers_count: number
  website?: string
}

export interface FacebookAdAccount {
  id: string
  name: string
  status: string
  status_code: number
  status_color: string
  currency: string
  timezone: string
  amount_spent: number
  balance: number
  spend_cap: number
  created_time: string
  funding_source: string
  is_active: boolean
}

export interface FacebookLeadForm {
  id: string
  name: string
  status: string
  created_time: string
  leads_count: number
  form_type: string
  context_card: {
    title: string
    description: string
    button_text: string
  }
  questions_count: number
  questions: Array<{
    key: string
    label: string
    type: string
    options?: string[]
  }>
  thank_you_page: {
    title: string
    body: string
  }
  is_active: boolean
}

export interface FacebookLead {
  id: string
  created_time: string
  ad_id: string
  ad_name: string
  adset_id: string
  adset_name: string
  campaign_id: string
  campaign_name: string
  form_id: string
  is_organic: boolean
  platform: string
  field_data: Array<{
    name: string
    values: string[]
  }>
  processed_data: Record<string, string>
}

// Hook for Facebook Pages
export function useFacebookPages(enabled: boolean = true) {
  const [data, setData] = useState<FacebookPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPages = async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Fetching Facebook Pages...')
      
      // Get the Facebook user ID from localStorage
      const facebookUserId = localStorage.getItem('facebook_user_id')
      
      const response = await fetch('/api/integrations/facebook/pages', {
        headers: {
          'x-facebook-connected': 'true',
          'x-facebook-user-id': facebookUserId || ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('✅ Facebook Pages loaded:', result.pages.length)
      setData(result.pages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pages'
      console.error('❌ Error loading Facebook Pages:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [enabled])

  return {
    pages: data,
    loading,
    error,
    refetch: fetchPages
  }
}

// Hook for Facebook Ad Accounts
export function useFacebookAdAccounts(enabled: boolean = true, timeFilter: string = 'last_30_days') {
  const [data, setData] = useState<FacebookAdAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAdAccounts = async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Fetching Facebook Ad Accounts with time filter:', timeFilter)
      
      // Get the Facebook user ID from localStorage
      const facebookUserId = localStorage.getItem('facebook_user_id')
      
      const response = await fetch(`/api/integrations/facebook/ad-accounts?time_filter=${timeFilter}`, {
        headers: {
          'x-facebook-connected': 'true',
          'x-facebook-user-id': facebookUserId || ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ad accounts: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('✅ Facebook Ad Accounts loaded:', result.ad_accounts.length)
      setData(result.ad_accounts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ad accounts'
      console.error('❌ Error loading Facebook Ad Accounts:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdAccounts()
  }, [enabled, timeFilter])

  return {
    adAccounts: data,
    loading,
    error,
    refetch: fetchAdAccounts
  }
}

// Hook for Facebook Lead Forms
export function useFacebookLeadForms(pageId: string | null, enabled: boolean = true) {
  const [data, setData] = useState<FacebookLeadForm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeadForms = async () => {
    if (!enabled || !pageId) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🔄 Fetching Lead Forms for page: ${pageId}`)
      
      // Get the Facebook user ID from localStorage
      const facebookUserId = localStorage.getItem('facebook_user_id')
      
      // Support both single pageId and comma-separated pageIds
      const url = pageId.includes(',') 
        ? `/api/integrations/facebook/lead-forms?pageIds=${pageId}`
        : `/api/integrations/facebook/lead-forms?pageId=${pageId}`
      
      const response = await fetch(url, {
        headers: {
          'x-facebook-connected': 'true',
          'x-facebook-user-id': facebookUserId || ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch lead forms: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('✅ Facebook Lead Forms loaded:', result.forms.length)
      setData(result.forms)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lead forms'
      console.error('❌ Error loading Facebook Lead Forms:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeadForms()
  }, [pageId, enabled])

  return {
    leadForms: data,
    loading,
    error,
    refetch: fetchLeadForms
  }
}

// Hook for Facebook Leads
export function useFacebookLeads(formId?: string, pageId?: string, enabled: boolean = true) {
  const [data, setData] = useState<FacebookLead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = async () => {
    if (!enabled || (!formId && !pageId)) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (formId) params.append('formId', formId)
      if (pageId) params.append('pageId', pageId)
      
      console.log(`🔄 Fetching Facebook Leads for ${formId ? 'form: ' + formId : 'page: ' + pageId}`)
      
      // Get the Facebook user ID from localStorage
      const facebookUserId = localStorage.getItem('facebook_user_id')
      
      const response = await fetch(`/api/integrations/facebook/leads?${params.toString()}`, {
        headers: {
          'x-facebook-connected': 'true',
          'x-facebook-user-id': facebookUserId || ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      console.log('✅ Facebook Leads loaded:', result.leads.length)
      setData(result.leads)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads'
      console.error('❌ Error loading Facebook Leads:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [formId, pageId, enabled])

  return {
    leads: data,
    loading,
    error,
    refetch: fetchLeads
  }
}